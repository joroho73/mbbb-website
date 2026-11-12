<?php
declare(strict_types=1);
use PHPMailer\PHPMailer\PHPMailer;

function respond(int $status, string $message): void {
    http_response_code($status);
    if ($status === 429) header('Retry-After: 900');
    if ($status === 405) header('Allow: POST');
    echo json_encode(['ok' => $status === 200, 'message' => $message]);
    exit;
}

function validFields($data): array {
    if (!is_object($data)) throw new InvalidArgumentException('Expected object');
    $limits = ['first-name'=>100, 'last-name'=>100, 'email'=>254,
        'event-date'=>10, 'event-type'=>100, 'message'=>8000, 'website'=>200];
    $clean = [];
    foreach ($limits as $field => $limit) {
        $value = $data->$field ?? '';
        if (!is_string($value) || preg_match_all('/./us', $value) > $limit || strpos($value, "\0") !== false) {
            throw new InvalidArgumentException('Invalid field');
        }
        $clean[$field] = trim($value);
    }
    foreach (['first-name','last-name','email','message'] as $field) {
        if ($clean[$field] === '') throw new InvalidArgumentException('Missing field');
    }
    if (!filter_var($clean['email'], FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Invalid email');
    foreach (['first-name','last-name','email','event-type'] as $field) {
        if (preg_match('/[\r\n]/', $clean[$field])) throw new InvalidArgumentException('Invalid line break');
    }
    if ($clean['event-date'] !== '') {
        if (!preg_match('/\A(\d{4})-(\d{2})-(\d{2})\z/', $clean['event-date'], $parts)
            || !checkdate((int)$parts[2], (int)$parts[3], (int)$parts[1])) {
            throw new InvalidArgumentException('Invalid date');
        }
    }
    return $clean;
}

function allowAttempt(string $client, string $secret): bool {
    // Bounded storage, shared across PHP workers. Fail closed if storage fails.
    $file = fopen(__DIR__ . '/state/rate-limits.json', 'c+');
    if (!$file) throw new RuntimeException('Rate storage unavailable');
    try {
        if (!flock($file, LOCK_EX)) throw new RuntimeException('Cannot lock rate storage');
        $raw = stream_get_contents($file, 4000001);
        if ($raw === false || strlen($raw) > 4000000) throw new RuntimeException('Invalid rate storage');
        $entries = $raw === '' ? [] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($entries)) throw new RuntimeException('Invalid rate storage');
        $now = time();
        foreach ($entries as $key => $hits) {
            if (!is_array($hits)) throw new RuntimeException('Invalid rate storage');
            $entries[$key] = array_values(array_filter($hits, static function ($t) use ($now) {
                return is_int($t) && $t > $now - 900;
            }));
            if (!$entries[$key]) unset($entries[$key]);
        }
        $key = hash_hmac('sha256', $client, $secret);
        $hits = $entries[$key] ?? [];
        $allowed = count($hits) < 5 && (isset($entries[$key]) || count($entries) < 10000);
        if ($allowed) { $hits[] = $now; $entries[$key] = $hits; }
        $encoded = json_encode($entries, JSON_THROW_ON_ERROR);
        rewind($file);
        if (!ftruncate($file, 0) || fwrite($file, $encoded) !== strlen($encoded) || !fflush($file)) {
            throw new RuntimeException('Cannot save rate storage');
        }
        return $allowed;
    } finally { fclose($file); }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, 'Not available.');
$config = json_decode(file_get_contents(__DIR__ . '/config.json'), true, 512, JSON_THROW_ON_ERROR);
foreach (['SMTP_HOST','SMTP_USERNAME','SMTP_PASSWORD','MAIL_FROM','MAIL_TO','MAIL_SUBJECT_PREFIX','PUBLIC_ORIGIN','RATE_LIMIT_SECRET'] as $key) {
    if (!isset($config[$key]) || !is_string($config[$key]) || trim($config[$key]) === '') throw new RuntimeException('Missing configuration');
}
foreach (['MAIL_FROM','MAIL_TO'] as $key) {
    if (!filter_var($config[$key], FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Invalid mail configuration');
}
if (strlen($config['RATE_LIMIT_SECRET']) < 32) throw new RuntimeException('Invalid rate limit secret');
if (!isset($config['SMTP_PORT']) || !is_int($config['SMTP_PORT']) || $config['SMTP_PORT'] < 1 || $config['SMTP_PORT'] > 65535) throw new RuntimeException('Invalid SMTP port');
if (($_SERVER['HTTP_ORIGIN'] ?? '') !== $config['PUBLIC_ORIGIN']) respond(403, 'Please submit the form from our website.');
$type = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
if ($type !== 'application/json') respond(415, 'Unsupported submission format.');
// Trust the host-provided remote address, never a visitor-supplied forwarded header.
$client = $_SERVER['REMOTE_ADDR'] ?? '';
if (!filter_var($client, FILTER_VALIDATE_IP)) throw new RuntimeException('Missing client address');
umask(0077);
if (!allowAttempt($client, $config['RATE_LIMIT_SECRET'])) respond(429, 'Too many attempts. Please wait 15 minutes or email us directly.');
$raw = file_get_contents('php://input', false, null, 0, 24001);
if ($raw === false || strlen($raw) === 0 || strlen($raw) > 24000) respond(413, 'The message is too large or empty.');
try {
    $data = validFields(json_decode($raw, false, 32, JSON_THROW_ON_ERROR));
} catch (JsonException | InvalidArgumentException $error) {
    respond(400, 'Please check the required fields, email address, date and message length.');
}
// Do not claim delivery when an anti-spam check prevented sending.
if ($data['website'] !== '') respond(400, 'Your enquiry could not be sent. Please clear the form and try again, or email us directly.');
require __DIR__ . '/vendor/autoload.php';
// At most three simultaneous SMTP connections across workers.
$slot = null;
for ($i = 0; $i < 3; $i++) {
    $candidate = fopen(__DIR__ . '/state/mail-' . $i . '.lock', 'c');
    if (!$candidate) throw new RuntimeException('Cannot open mail lock');
    if (flock($candidate, LOCK_EX | LOCK_NB)) { $slot = $candidate; break; }
    fclose($candidate);
}
if ($slot === null) respond(503, 'We are busy at the moment. Please try again shortly.');
$sent = false;
try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $config['SMTP_HOST'];
    $mail->Port = $config['SMTP_PORT'];
    $mail->SMTPAuth = true;
    $mail->Username = $config['SMTP_USERNAME'];
    $mail->Password = $config['SMTP_PASSWORD'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Timeout = 15;
    $mail->Timelimit = 30;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($config['MAIL_FROM'], 'Melvin Beddow Big Band');
    $mail->addAddress($config['MAIL_TO']);
    $mail->addReplyTo($data['email']);
    $name = preg_replace('/\s+/u', ' ', $data['first-name'] . ' ' . $data['last-name']);
    $mail->Subject = $config['MAIL_SUBJECT_PREFIX'] . ' ' . $name;
    $mail->Body = implode("\n", [
        'New website enquiry', '', 'Name: ' . $name, 'Email: ' . $data['email'],
        'Event date: ' . ($data['event-date'] ?: 'Not supplied'),
        'Event type: ' . ($data['event-type'] ?: 'Not supplied'),
        '', 'Message:', $data['message'],
    ]);
    $sent = $mail->send();
} catch (Throwable $error) {
    error_log('MBBB contact: email submission failed (' . get_class($error) . ')');
} finally { fclose($slot); }
if (!$sent) respond(502, 'Your enquiry could not be confirmed as sent. Please try again or email us directly.');
error_log('MBBB contact: SMTP accepted an enquiry');
respond(200, 'Thank you. Your enquiry has been sent.');
