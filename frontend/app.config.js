module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    // An EAS file environment variable supplies this path on remote builders.
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || config.ios.googleServicesFile,
  },
});
