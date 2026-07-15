const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'apps', 'server');
const runtimeDir = path.join(rootDir, 'server-runtime');
const electronVersion = require(path.join(rootDir, 'package.json')).devDependencies.electron.replace(/^[^\d]*/, '');
const targetPlatformArg = process.argv.find((arg) => arg.startsWith('--platform='));
const targetArchArg = process.argv.find((arg) => arg.startsWith('--arch='));
const targetPlatform = targetPlatformArg
  ? targetPlatformArg.slice('--platform='.length)
  : process.env.npm_config_platform || process.platform;
const targetArch = targetArchArg
  ? targetArchArg.slice('--arch='.length)
  : process.env.npm_config_arch || process.arch;

if (!['win32', 'darwin'].includes(targetPlatform)) {
  console.error(`[prepare-server-runtime] Unsupported platform: ${targetPlatform}`);
  process.exit(1);
}

if (!['x64', 'ia32', 'arm64'].includes(targetArch)) {
  console.error(`[prepare-server-runtime] Unsupported architecture: ${targetArch}`);
  process.exit(1);
}

fs.rmSync(runtimeDir, { recursive: true, force: true });
fs.mkdirSync(runtimeDir, { recursive: true });

fs.cpSync(path.join(serverDir, 'dist'), path.join(runtimeDir, 'dist'), { recursive: true });
fs.copyFileSync(path.join(serverDir, 'package.json'), path.join(runtimeDir, 'package.json'));
fs.copyFileSync(path.join(serverDir, 'package-lock.json'), path.join(runtimeDir, 'package-lock.json'));

const npmCommand = process.platform === 'win32'
  ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
  : 'npm';
const npmInstallFlags = targetPlatform === process.platform && targetArch === process.arch
  ? 'install --omit=dev'
  : 'install --omit=dev --ignore-scripts';
const npmArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', `npm.cmd ${npmInstallFlags}`]
  : npmInstallFlags.split(' ');

async function rebuildNativeModules() {
  if (targetPlatform !== process.platform) {
    const moduleDir = path.join(runtimeDir, 'node_modules', 'better-sqlite3');
    const prebuildInstall = path.join(runtimeDir, 'node_modules', '.bin', 'prebuild-install');
    execFileSync(prebuildInstall, [
      '--runtime', 'electron',
      '--target', electronVersion,
      '--platform', targetPlatform,
      '--arch', targetArch,
      '--force',
    ], {
      cwd: moduleDir,
      stdio: 'inherit',
    });

    const binaryPath = path.join(moduleDir, 'build', 'Release', 'better_sqlite3.node');
    const magic = fs.readFileSync(binaryPath).subarray(0, 2).toString('ascii');
    if (targetPlatform === 'win32' && magic !== 'MZ') {
      throw new Error(`Invalid Windows native module: ${binaryPath}`);
    }
    console.error(`Installed better-sqlite3 prebuild for ${targetPlatform}-${targetArch}`);
    return;
  }

  const originalRealpath = fs.promises.realpath.bind(fs.promises);

  fs.promises.realpath = async (targetPath, options) => {
    try {
      return await originalRealpath(targetPath, options);
    } catch (error) {
      if (process.platform === 'win32' && error.code === 'ENOENT' && fs.existsSync(targetPath)) {
        return fs.realpathSync(targetPath);
      }

      throw error;
    }
  };

  const rebuildModuleUrl = pathToFileURL(
    path.join(rootDir, 'node_modules', '@electron', 'rebuild', 'lib', 'rebuild.js')
  ).href;
  const { rebuild } = await import(rebuildModuleUrl);

  const rebuildTask = rebuild({
    buildPath: runtimeDir,
    electronVersion,
    arch: targetArch,
    extraModules: ['better-sqlite3'],
    force: true,
    types: ['prod', 'optional'],
    mode: 'sequential',
    projectRootPath: rootDir,
  });

  rebuildTask.lifecycle.on('modules-found', (moduleNames) => {
    if (moduleNames.length > 0) {
      console.error(`Building modules: ${moduleNames.join(', ')}`);
    } else {
      console.error('No native modules found');
    }
  });

  await rebuildTask;
}

async function main() {
  console.error(`[prepare-server-runtime] Preparing server runtime for ${targetPlatform}-${targetArch}`);
  execFileSync(npmCommand, npmArgs, {
    cwd: runtimeDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_platform: targetPlatform,
      npm_config_arch: targetArch,
      npm_config_target_arch: targetArch,
    },
  });

  console.error('Searching dependency tree');
  await rebuildNativeModules();
  console.error('Rebuild complete');

  execFileSync(process.execPath, [path.join(rootDir, 'scripts', 'create-clean-template-db.js')], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  console.log(`[prepare-server-runtime] Server runtime prepared at ${runtimeDir}`);
}

main().catch((error) => {
  console.error('[prepare-server-runtime] Failed to prepare server runtime:');
  console.error(error);
  process.exit(1);
});
