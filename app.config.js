module.exports = ({ config }) => {
  const isDedicatedAdmin =
    process.env.BOOFFIN_TARGET === 'admin' ||
    process.env.EXPO_TARGET === 'admin';

  if (!isDedicatedAdmin) {
    return {
      ...config,
    };
  }

  process.env.EXPO_ROUTER_APP_ROOT = 'src/admin-app';

  const plugins = (config.plugins || []).map((plugin) => {
    if (
      plugin === 'expo-router' ||
      (Array.isArray(plugin) && plugin[0] === 'expo-router')
    ) {
      return ['expo-router', { root: 'src/admin-app' }];
    }
    return plugin;
  });

  return {
    ...config,
    name: 'BooffIn Admin Portal',
    slug: 'booffin-admin',
    plugins,
    web: {
      ...config.web,
      name: 'BooffIn Admin Portal',
      shortName: 'BooffIn Admin',
      description: 'BooffIn Administrative and Governance Portal',
      startUrl: '/',
    },
    extra: {
      ...config.extra,
      router: {
        ...config.extra?.router,
        root: 'src/admin-app',
      },
    },
  };
};

