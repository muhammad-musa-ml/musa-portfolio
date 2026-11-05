import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stagePrivateRelease, PUBLIC_ASSETS, PRIVATE_FILES } from './stage-private-release.mjs';

const exec = promisify(execFile);
async function put(root, file, value) {
  const destination = path.join(root, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, value);
}
async function fixture(t) {
  const temporary = path.resolve(tmpdir());
  const root = await mkdtemp(path.join(temporary, 'portfolio-private-stage-'));
  t.after(async () => {
    assert.equal(path.dirname(root), temporary);
    assert.ok(path.basename(root).startsWith('portfolio-private-stage-'));
    await rm(root, { recursive: true, force: true });
  });
  const sourceRoot = path.join(root, 'source');
  const kaijuRoot = path.join(root, 'companion');
  const output = path.join(root, 'assembled');
  await mkdir(sourceRoot); await mkdir(kaijuRoot);
  await put(sourceRoot, '.gitignore', '.env*\n!.env.example\nnode_modules\n.vercel\n');
  await put(sourceRoot, '.env.example', 'PLACEHOLDER=must-not-be-copied');
  await put(sourceRoot, 'package.json', JSON.stringify({name:'fixture',type:'module',scripts:{build:'vite build',postbuild:'node scripts/prerender.mjs'}}));
  await put(sourceRoot, 'package-lock.json', '{}');
  await put(sourceRoot, 'src/main.tsx', 'export const original = true;');
  await put(sourceRoot, 'vercel.json', JSON.stringify({framework:'vite',outputDirectory:'dist',buildCommand:'npm run build',rewrites:[{source:'/work',destination:'/work/index.html'},{source:'/((?!api/).*)',destination:'/index.html'}]}));
  await put(sourceRoot, 'api/chat.ts', 'export default function chat() {}');
  await put(sourceRoot, 'scripts/prerender.mjs', '');
  await put(sourceRoot, '.env.local', 'PRIVATE_CREDENTIAL=never-copy-this');
  await put(sourceRoot, '.vercel/project.json', '{"token":"must-not-copy"}');
  await exec('git',['init','--quiet'],{cwd:sourceRoot});
  await exec('git',['add','.'],{cwd:sourceRoot});
  for (const file of PRIVATE_FILES) await put(kaijuRoot,file,'private-' + file);
  const sha256 = {};
  for (const file of ['private/app/model.mjs','private/app/search.mjs','private/recognize.py'])
    sha256[file] = createHash('sha256').update(await readFile(path.join(kaijuRoot,file))).digest('hex');
  await put(kaijuRoot,'engine-provenance.json',JSON.stringify({sha256}));
  for (const file of PUBLIC_ASSETS) await put(kaijuRoot,'public/'+file,'public-' + file);
  await put(kaijuRoot,'public/index.html','<html><head><title>Planner</title></head><body></body></html>');
  await put(kaijuRoot,'public/app.mjs',"fetch('/api/search'); fetch('/api/recognize');");
  await put(kaijuRoot,'public/presentation.mjs',"fetch('/api/bootstrap'); fetch('/api/replay');");
  await put(kaijuRoot,'.env.local','HOST_SECRET=never-copy-either');
  await put(kaijuRoot,'private/stray-secret.txt','do-not-copy-private-extras');
  await put(kaijuRoot,'public/unapproved.txt','do-not-copy-public-extras');
  await put(kaijuRoot,'requirements.txt','Pillow\nnumpy\n');
  const functions = {};
  for (const name of ['bootstrap','replay','search']) {
    functions['api/'+name+'.mjs'] = {maxDuration:name==='search'?240:10,...(name==='search'?{includeFiles:'private/**',supportsCancellation:true}:{})};
    await put(kaijuRoot,'api/'+name+'.mjs',`import { service } from '../private/service.mjs';\nexport default (req, res) => service.handle(req, res, '/api/${name}');`);
  }
  functions['api/recognize.py'] = {maxDuration:60,includeFiles:'private/**'};
  await put(kaijuRoot,'api/recognize.py',"bridge = Path(os.getcwd()) / 'private' / 'recognize_bridge.py'");
  await put(kaijuRoot,'vercel.json',JSON.stringify({functions,headers:[{source:'/(.*)',headers:[{key:'Content-Security-Policy',value:"default-src 'self'; frame-ancestors 'self' https://iammusa.vercel.app"}]}]}));
  return {root,sourceRoot,kaijuRoot,output};
}
const missing = async file => assert.rejects(lstat(file), {code:'ENOENT'});

test('stages current reviewed files, private APIs and only allowed public assets without credentials', async t => {
  const f = await fixture(t);
  await put(f.sourceRoot,'src/main.tsx','export const changedWorkingFile = true;');
  const result = await stagePrivateRelease(f);
  assert.equal(result.plannerPath,'/kaiju/');
  assert.equal(await readFile(path.join(f.output,'src/main.tsx'),'utf8'),'export const changedWorkingFile = true;');
  for (const file of ['.env.local','.env.example','.vercel/project.json','private/stray-secret.txt','public/kaiju/unapproved.txt']) await missing(path.join(f.output,file));
  for (const file of PRIVATE_FILES) assert.deepEqual(await readFile(path.join(f.output,file)),await readFile(path.join(f.kaijuRoot,file)));
  assert.match(await readFile(path.join(f.output,'api/kaiju/search.mjs'),'utf8'), /\.\.\/\.\.\/private\/service\.mjs/);
  assert.match(await readFile(path.join(f.output,'api/kaiju/search.mjs'),'utf8'), /'\/api\/search'/);
  assert.match(await readFile(path.join(f.output,'public/kaiju/app.mjs'),'utf8'), /\/api\/kaiju\/search/);
  assert.match(await readFile(path.join(f.output,'public/kaiju/presentation.mjs'),'utf8'), /\/api\/kaiju\/bootstrap/);
  assert.match(await readFile(path.join(f.output,'public/kaiju/index.html'),'utf8'), /<base href="\/kaiju\/">/);
  const config = JSON.parse(await readFile(path.join(f.output,'vercel.json'),'utf8'));
  assert.equal(config.git.deploymentEnabled,false);
  assert.equal(config.functions['api/kaiju/search.mjs'].supportsCancellation,true);
  assert.equal(config.functions['api/kaiju/recognize.py'].includeFiles,'private/**');
  const fallback = config.rewrites.find(rule=>rule.destination==='/index.html');
  const regex = new RegExp('^'+fallback.source+'$');
  for (const route of ['/api/chat','/api/kaiju/search','/kaiju','/kaiju/','/kaiju/app.mjs','/private/app/model.mjs','/.env.local','/.env','/.git/config','/.vercel/project.json','/server.mjs','/package.json','/package-lock.json','/model.mjs','/search.mjs','/requirements.txt','/server/musai/prompt.mjs']) assert.equal(regex.test(route),false,route);
  for (const route of ['/kaiju','/kaiju/']) assert.equal(config.rewrites.find(rule=>rule.source===route)?.destination,'/kaiju/index.html');
  assert.equal(regex.test('/about'),true);
  assert.equal(config.headers.length,2);
  await cp(path.join(f.output,'public'),path.join(f.output,'dist'),{recursive:true});
  await exec(process.execPath,['scripts/verify-private-output.mjs'],{cwd:f.output});
  await put(f.output,'dist/private/model.mjs','exposed engine');
  await assert.rejects(exec(process.execPath,['scripts/verify-private-output.mjs'],{cwd:f.output}),/Private content entered static output/);
});

test('refuses existing output, source-contained output, and missing output parents without changing them', async t => {
  const f = await fixture(t);
  await mkdir(f.output); await put(f.output,'sentinel','keep');
  await assert.rejects(stagePrivateRelease(f),/already exists/);
  assert.equal(await readFile(path.join(f.output,'sentinel'),'utf8'),'keep');
  await assert.rejects(stagePrivateRelease({...f,output:path.join(f.sourceRoot,'stage')}),/outside/);
  await assert.rejects(stagePrivateRelease({...f,output:path.join(f.kaijuRoot,'stage')}),/outside/);
  await assert.rejects(stagePrivateRelease({...f,output:f.root}),/outside/);
  await assert.rejects(stagePrivateRelease({...f,output:path.join(f.root,'missing','stage')}),{code:'ENOENT'});
});

test('requires new public source to be reviewed in Git and catches missing tracked files', async t => {
  const f = await fixture(t);
  await put(f.sourceRoot,'src/new.ts','export const newFile = true;');
  await assert.rejects(stagePrivateRelease(f),/git-add new source files/);
  await missing(f.output);
  await exec('git',['add','src/new.ts'],{cwd:f.sourceRoot});
  await rm(path.join(f.sourceRoot,'src/main.tsx'));
  await assert.rejects(stagePrivateRelease(f),{code:'ENOENT'});
  await missing(f.output);
});

test('refuses symlinked output parents and input directories', async t => {
  const f = await fixture(t);
  const linked = path.join(f.root,'linked');
  await symlink(f.kaijuRoot,linked,process.platform==='win32'?'junction':'dir');
  await assert.rejects(stagePrivateRelease({...f,output:path.join(linked,'release')}),/Symlink or junction/);
  await assert.rejects(stagePrivateRelease({...f,kaijuRoot:linked}),/Symlink or junction/);
  await missing(f.output);
});

test('rejects browser engine imports and changed original engines before creating output', async t => {
  const f = await fixture(t);
  await put(f.kaijuRoot,'public/app.mjs',"import {simulate} from '../private/app/model.mjs';");
  await assert.rejects(stagePrivateRelease(f),/Private solver reference/);
  await missing(f.output);
  await put(f.kaijuRoot,'public/app.mjs',"fetch('/api/search');");
  await put(f.kaijuRoot,'private/app/model.mjs','changed-original-engine');
  await assert.rejects(stagePrivateRelease(f),/engine hash mismatch/);
  await missing(f.output);
});
