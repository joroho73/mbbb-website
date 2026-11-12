# Pull and Rebuild
It is necessary to rebuild the manifest files after pulling from the repo because Pages CMS changes the YAML files, while GitHub Actions generates updated manifests for deployment without committing them back to GitHub.

Start in the project directory with local work committed.

```
git pull --ff-only
npm run content:build
node scripts/build-gallery.mjs
```
These commands update the local preview. They do not deploy anything.

# Deploy static files to Bobcat
```
./deploy-preview.sh --dry-run
./deploy-preview.sh
```

- CMS content is published separately by GitHub Actions.
- Private PHP configuration and server scripts are deployed separately.


# Deploy files to Margay VPS
The previous server is deployed to via ssh - note this is due to be deprecated.
```
cd /path-to-project
ssh -MNf mbbb
enter passphrase
bash deploy.sh
```