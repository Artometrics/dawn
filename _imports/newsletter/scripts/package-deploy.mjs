import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('/opt/cursor/artifacts', { recursive: true });
execSync('npm run build --prefix web', { stdio: 'inherit' });
execSync('cp functions/openapi.yaml openapi.yaml', { stdio: 'inherit' });
const tar = '/opt/cursor/artifacts/newsletter-deploy.tar.gz';
execSync(
  `tar -czf ${tar} --exclude node_modules --exclude .git --exclude .firebase --exclude '.env' --exclude '.env.local' --exclude '.env.production' --exclude '**/.env.local' --exclude '**/.secret.local' --exclude .secret.local --exclude '*.pem' --exclude '*.key' --exclude 'service-account*.json' --exclude coverage --exclude .local --exclude '*.log' --exclude .impeccable/review -C /workspace .`,
  { stdio: 'inherit' },
);
console.log(tar);
