const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// zustand v5 の ESM ビルドは import.meta を含み、web バンドルで
// "Cannot use 'import.meta' outside a module" になるため CJS 版へ解決する
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "zustand" || moduleName.startsWith("zustand/")) {
    const cjsName =
      moduleName === "zustand" ? "zustand/index.js" : `${moduleName}.js`;
    return context.resolveRequest(context, cjsName, platform);
  }
  return (defaultResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  );
};

module.exports = config;
