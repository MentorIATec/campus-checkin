import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '../..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

const [frontend, config, html, appsScript, setup, vercel, lookupApi, checkinApi] = await Promise.all([
  read('public/app.js'),
  read('public/config.js'),
  read('public/index.html'),
  read('ad26/apps-script/Code.js'),
  read('ad26/apps-script/Setup.js'),
  read('vercel.json'),
  read('api/estudiante.js'),
  read('api/checkin.js')
]);

const checks = [
  ['frontend usa event_id AD26', frontend.includes('bienvenida-transferencias-ad26')],
  ['config usa periodo AD26', config.includes("PERIOD: 'AD26'")],
  ['Apps Script usa event_id AD26', appsScript.includes("EVENT_ID: 'bienvenida-transferencias-ad26'")],
  ['frontend no contiene API key', !/API_KEY|GOOGLE_SCRIPT_KEY/.test(config)],
  ['registro envia solamente matricula', !/mentorFullname|fullnameEstudiante|comunidad/.test(extractFetchBody(frontend, '/api/checkin'))],
  ['CTA de check-in es explicito', html.includes('Registrar mi check-in')],
  ['todos los botones declaran tipo', !/<button(?![^>]*\btype=)/i.test(html)],
  ['ruta staff automatizada retirada', !JSON.parse(vercel).rewrites.some(item => item.source === '/staff')],
  ['lookup tiene limite defensivo', lookupApi.includes("namespace: 'student-lookup'")],
  ['check-in tiene limite defensivo', checkinApi.includes("namespace: 'checkin-write'")],
  ['Apps Script no expone accion incident', !appsScript.includes("action === 'incident'")],
  ['incidencias se capturan manualmente', setup.includes("'registrado_por', 'observaciones'")],
  ['total combina digitales y manuales', setup.includes('=B5+B6-IF(B6=0,0,SUM(ARRAYFORMULA')],
  ['dashboard conserva metricas operativas FJ26', setup.includes('Pendientes del padron') && setup.includes('Top comunidades') && setup.includes('Top mentores') && setup.includes('Top campus')],
  ['snapshot asigna fotos por mentor_id', (await read('ad26/apps-script/Snapshot.js')).includes('AD26_MENTOR_PHOTOS')],
  ['poblacion exige activo y periodo AD26', appsScript.includes('populationRow.activo') && appsScript.includes('populationRow.periodo')],
  ['frontend no consulta stats al iniciar', !frontend.includes('void actualizarStatsBar()')],
  ['frontend reintenta errores transitorios', frontend.includes('enviarCheckinConReintento')]
];

const failed = checks.filter(([, ok]) => !ok);
checks.forEach(([label, ok]) => console.log(`${ok ? 'OK' : 'FAIL'} ${label}`));
if (failed.length) process.exitCode = 1;

function extractFetchBody(source, endpoint) {
  const start = source.indexOf(`fetch('${endpoint}'`);
  if (start < 0) return '';
  return source.slice(start, source.indexOf('});', start) + 3);
}
