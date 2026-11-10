<?php
declare(strict_types=1);
// Public entry point only. Dependencies, settings and rate limits live outside www.
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
try {
    require '/home/dcshosting/mbbb-contact/handler.php';
} catch (Throwable $error) {
    error_log('MBBB contact: internal failure (' . get_class($error) . ')');
    http_response_code(503);
    echo json_encode(['ok' => false, 'message' => 'The enquiry service is unavailable. Please try again later or email us directly.']);
}
