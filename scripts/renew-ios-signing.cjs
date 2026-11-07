#!/usr/bin/env node
'use strict';

// One-time recovery for Gains Chat's missing distribution certificate.
// Default: read-only. --apply: create and assign fresh App Store credentials.
// Uses the audited, installed official EAS CLI 24.7.0 APIs. All private keys,
// passwords, P12s, and profile bytes stay in memory and EAS's credentials service.
// There are no credential-file writes, revocations, deletions, or AdHoc updates.
const fs = require('node:fs');
const path = require('node:path');
const EAS = '/opt/homebrew/lib/node_modules/eas-cli';
const EXPECTED = Object.freeze({
  projectId: '50b34f80-9b2c-4335-af07-2a501c387f25',
  fullName: '@blackmaskexe/gains-chat',
  owner: 'blackmaskexe',
  slug: 'gains-chat',
  bundle: 'com.blackmaskexe.gainschat',
  team: 'T296YJXC87',
  container: 'iCloud.com.blackmaskexe.gainschat',
  oldSerial: '67E4D95CD91C9E5AF02D7A9F55A1312A',
});
// Objects created by the first recovery attempt, which stopped safely before
// assignment while checking the profile's CloudKit entitlement representation.
const CREATED = Object.freeze({
  appleCertificateId: 'BN5VPX3XG6',
  serial: '217CF2AE5B31BF843F4D7BB30DB98B84',
  easCertificateId: '7994fb8f-6c14-407d-80df-73936117b275',
  appleProfileId: 'N6C53BL3W4',
});

let stage = 'preflight';
function check(condition, code) {
  if (!condition) {
    const error = new Error(code);
    error.safeCode = code;
    throw error;
  }
}
const api = relative => require(path.join(EAS, 'build', relative));
const serial = value => String(value ?? '').toUpperCase();
const includes = (value, expected) => value === expected || (Array.isArray(value) && value.includes(expected));

async function main() {
  const flags = process.argv.slice(2);
  check(flags.length <= 1 && (!flags.length || ['--dry-run', '--apply', '--inspect-created', '--resume-created'].includes(flags[0])), 'INVALID_ARGUMENTS');
  const resume = flags[0] === '--resume-created';
  const inspect = flags[0] === '--inspect-created';
  const apply = flags[0] === '--apply' || resume;
  // Debug logging in dependencies can include request details; refuse it.
  check(!process.env.DEBUG && !process.env.EXPO_DEBUG && !process.env.NODE_DEBUG, 'DISABLE_DEBUG_LOGGING');
  check(require(path.join(EAS, 'package.json')).version === '24.7.0', 'EAS_VERSION_REQUIRES_REVIEW');
  const expo = JSON.parse(fs.readFileSync(path.join(__dirname, '../frontend/app.json'), 'utf8')).expo;
  check(expo.extra?.eas?.projectId === EXPECTED.projectId && expo.slug === EXPECTED.slug &&
    expo.ios?.bundleIdentifier === EXPECTED.bundle && expo.ios?.appleTeamId === EXPECTED.team, 'LOCAL_CONFIG_SCOPE_MISMATCH');
  const requested = expo.ios.entitlements;
  check(Array.isArray(requested?.['com.apple.developer.icloud-services']) &&
    requested['com.apple.developer.icloud-services'].length === 1 &&
    requested['com.apple.developer.icloud-services'][0] === 'CloudKit' &&
    Array.isArray(requested['com.apple.developer.icloud-container-identifiers']) &&
    requested['com.apple.developer.icloud-container-identifiers'].length === 1 &&
    requested['com.apple.developer.icloud-container-identifiers'][0] === EXPECTED.container,
  'LOCAL_CLOUDKIT_SCOPE_MISMATCH');

  const SessionManager = api('user/SessionManager').default;
  const { createGraphqlClient } = api('commandUtils/context/contextUtils/createGraphqlClient');
  const { AppQuery } = api('graphql/queries/AppQuery');
  const { AppleAppIdentifierQuery } = api('credentials/ios/api/graphql/queries/AppleAppIdentifierQuery');
  const { IosAppCredentialsQuery } = api('credentials/ios/api/graphql/queries/IosAppCredentialsQuery');
  const { AppStoreConnectApiKeyQuery } = api('graphql/queries/AppStoreConnectApiKeyQuery');
  const { IosDistributionType } = api('graphql/generated');
  const session = new SessionManager({ setActor() {} });
  check(await session.getUserAsync(), 'EXISTING_EAS_LOGIN_REQUIRED');
  const authentication = { accessToken: session.getAccessToken(), sessionSecret: session.getSessionSecret() };
  const graphqlClient = createGraphqlClient(authentication);
  stage = 'read scoped EAS metadata';
  const app = await AppQuery.byIdAsync(graphqlClient, EXPECTED.projectId);
  check(app.id === EXPECTED.projectId && app.fullName === EXPECTED.fullName && app.slug === EXPECTED.slug &&
    app.ownerAccount?.name === EXPECTED.owner, 'REMOTE_PROJECT_SCOPE_MISMATCH');
  const identifier = await AppleAppIdentifierQuery.byBundleIdentifierAsync(graphqlClient, EXPECTED.owner, EXPECTED.bundle);
  check(identifier?.id && identifier.bundleIdentifier === EXPECTED.bundle, 'EXISTING_BUNDLE_REQUIRED');
  const readCredentials = client => IosAppCredentialsQuery.withBuildCredentialsByAppIdentifierIdAsync(client,
    EXPECTED.fullName, { appleAppIdentifierId: identifier.id, iosDistributionType: IosDistributionType.AppStore });
  const credentials = await readCredentials(graphqlClient);
  check(credentials?.app?.id === EXPECTED.projectId && credentials.appleAppIdentifier?.id === identifier.id &&
    credentials.appleTeam?.appleTeamIdentifier === EXPECTED.team, 'APP_CREDENTIALS_SCOPE_MISMATCH');
  check(credentials.iosAppBuildCredentialsList?.length === 1, 'EXACTLY_ONE_APPSTORE_RECORD_REQUIRED');
  const build = credentials.iosAppBuildCredentialsList[0];
  check(build.iosDistributionType === IosDistributionType.AppStore && build.distributionCertificate?.id &&
    serial(build.distributionCertificate.serialNumber) === EXPECTED.oldSerial && build.provisioningProfile?.id,
  'EXPECTED_OLD_APPSTORE_CREDENTIALS_REQUIRED');
  check(build.distributionCertificate.appleTeam?.appleTeamIdentifier === EXPECTED.team &&
    build.provisioningProfile.appleTeam?.appleTeamIdentifier === EXPECTED.team, 'OLD_SIGNING_TEAM_MISMATCH');
  const keyMetadata = credentials.appStoreConnectApiKeyForSubmissions;
  check(keyMetadata?.id && keyMetadata.appleTeam?.appleTeamIdentifier === EXPECTED.team, 'EXISTING_ASC_KEY_FOR_TEAM_REQUIRED');
  const key = await AppStoreConnectApiKeyQuery.getByIdAsync(graphqlClient, keyMetadata.id);
  check(key?.keyP8 && key.keyIdentifier && key.issuerIdentifier, 'ASC_KEY_INCOMPLETE');

  stage = 'authenticate Apple and verify certificate absent';
  const AppStoreApi = api('credentials/ios/appstore/AppStoreApi').default;
  const { AuthenticationMode, AppleTeamType } = api('credentials/ios/appstore/authenticateTypes');
  const apple = new AppStoreApi();
  const auth = await apple.ensureAuthenticatedAsync({ mode: AuthenticationMode.API_KEY,
    ascApiKey: { keyP8: key.keyP8, keyId: key.keyIdentifier, issuerId: key.issuerIdentifier },
    teamId: EXPECTED.team, teamName: credentials.appleTeam.appleTeamName, teamType: AppleTeamType.INDIVIDUAL });
  check(auth.team.id === EXPECTED.team && auth.team.inHouse === false, 'APPLE_TEAM_SCOPE_MISMATCH');
  const appleCertificates = await apple.listDistributionCertificatesAsync();
  check(!appleCertificates.some(cert => serial(cert.serialNumber) === EXPECTED.oldSerial), 'OLD_CERTIFICATE_STILL_EXISTS');
  console.log(JSON.stringify({ mode: flags[0] ?? 'dry-run', project: EXPECTED.fullName,
    bundle: EXPECTED.bundle, team: EXPECTED.team, appStoreBuildCredentialId: build.id,
    missingCertificateSerial: EXPECTED.oldSerial, oldProfileId: build.provisioningProfile.id,
    oldCertificateValidUntil: build.distributionCertificate.validityNotAfter,
    existingAppleDistributionCertificateCount: appleCertificates.length }, null, 2));
  if (!apply && !inspect) {
    console.log('Read-only checks passed. --apply creates one distribution certificate and one App Store profile, then replaces only this App Store record’s two pointers.');
    return;
  }

  // Abort on concurrent changes before creating anything. A fresh GraphQL client
  // avoids the metadata cache. No existing credential is removed or revoked.
  const unchanged = async () => {
    const current = await readCredentials(createGraphqlClient(authentication));
    const currentBuild = current?.iosAppBuildCredentialsList?.[0];
    check(current?.id === credentials.id && current?.iosAppBuildCredentialsList?.length === 1 &&
      currentBuild?.id === build.id && currentBuild?.iosDistributionType === IosDistributionType.AppStore &&
      currentBuild?.distributionCertificate?.id === build.distributionCertificate.id &&
      currentBuild?.provisioningProfile?.id === build.provisioningProfile.id, 'CONCURRENT_CREDENTIAL_CHANGE');
  };
  const { ApplePlatform } = api('credentials/ios/appstore/constants');
  const { ProfileClass } = api('credentials/ios/appstore/provisioningProfile');
  let storedCert;
  let profile;
  if (resume || inspect) {
    stage = 'read exact previously created certificate and profile';
    check(appleCertificates.some(cert => cert.id === CREATED.appleCertificateId && serial(cert.serialNumber) === CREATED.serial),
      'CREATED_APPLE_CERTIFICATE_NOT_FOUND');
    const { AppleDistributionCertificateQuery } = api('credentials/ios/api/graphql/queries/AppleDistributionCertificateQuery');
    storedCert = (await AppleDistributionCertificateQuery.getAllForAccountAsync(graphqlClient, EXPECTED.owner))
      .find(cert => cert.id === CREATED.easCertificateId);
    check(storedCert?.developerPortalIdentifier === CREATED.appleCertificateId && serial(storedCert.serialNumber) === CREATED.serial &&
      storedCert.appleTeam?.appleTeamIdentifier === EXPECTED.team, 'CREATED_EAS_CERTIFICATE_SCOPE_MISMATCH');
    profile = (await apple.listProvisioningProfilesAsync(EXPECTED.bundle, ApplePlatform.IOS, ProfileClass.General))
      .find(item => item.provisioningProfileId === CREATED.appleProfileId);
    check(profile?.certificates?.length === 1 && profile.certificates[0].id === CREATED.appleCertificateId &&
      serial(profile.certificates[0].serialNumber) === CREATED.serial, 'CREATED_PROFILE_CERTIFICATE_MISMATCH');
  } else {
    check(!appleCertificates.some(cert => cert.id === CREATED.appleCertificateId || serial(cert.serialNumber) === CREATED.serial),
      'CREATED_CREDENTIALS_EXIST_USE_RESUME');
    await unchanged();
    stage = 'create Apple distribution certificate';
    const generated = await apple.createDistributionCertificateAsync();
    check(generated.teamId === EXPECTED.team && generated.certId && generated.distCertSerialNumber,
      'NEW_CERTIFICATE_SCOPE_MISMATCH');
    console.log(JSON.stringify({ createdAppleCertificateId: generated.certId, serial: generated.distCertSerialNumber }));
    stage = 'store distribution certificate in EAS';
    const { AppleDistributionCertificateMutation } = api('credentials/ios/api/graphql/mutations/AppleDistributionCertificateMutation');
    storedCert = await AppleDistributionCertificateMutation.createAppleDistributionCertificateAsync(graphqlClient, {
      certP12: generated.certP12, certPassword: generated.certPassword, certPrivateSigningKey: generated.certPrivateSigningKey,
      developerPortalIdentifier: generated.certId, appleTeamId: credentials.appleTeam.id,
    }, app.ownerAccount.id);
    check(storedCert?.id && serial(storedCert.serialNumber) === serial(generated.distCertSerialNumber), 'EAS_CERTIFICATE_MISMATCH');
    console.log(JSON.stringify({ createdEasCertificateId: storedCert.id }));
    stage = 'create Apple App Store profile';
    profile = await apple.createProvisioningProfileAsync(EXPECTED.bundle, generated,
      `*[expo] ${EXPECTED.bundle} AppStore ${new Date().toISOString()}`, ApplePlatform.IOS, ProfileClass.General);
  }
  check(profile.teamId === EXPECTED.team && profile.distributionMethod === 'IOS_APP_STORE' &&
    profile.provisioningProfile && profile.provisioningProfileId, 'NEW_APPSTORE_PROFILE_SCOPE_MISMATCH');
  console.log(JSON.stringify({ createdAppleProfileId: profile.provisioningProfileId }));
  // Validate the signed profile in memory before changing the active credentials.
  stage = 'validate production profile capabilities';
  const plist = api('credentials/ios/utils/provisioningProfile').parse(profile.provisioningProfile);
  const entitlements = plist.Entitlements;
  if (inspect) {
    const whitelist = ['application-identifier', 'com.apple.developer.team-identifier', 'get-task-allow',
      'com.apple.developer.icloud-services', 'com.apple.developer.icloud-container-identifiers',
      'com.apple.developer.icloud-container-development-container-identifiers',
      'com.apple.developer.icloud-container-environment',
      'com.apple.developer.devicecheck.appattest-environment', 'aps-environment'];
    console.log(JSON.stringify({ appleCertificateId: CREATED.appleCertificateId, easCertificateId: storedCert.id,
      appleProfileId: profile.provisioningProfileId, distributionMethod: profile.distributionMethod,
      teamIdentifier: plist.TeamIdentifier, expiration: plist.ExpirationDate,
      entitlements: Object.fromEntries(whitelist.filter(key => Object.hasOwn(entitlements, key)).map(key => [key, entitlements[key]])) }, null, 2));
    console.log('Read-only inspection complete. No credentials created, assigned, revoked, or written to disk.');
    return;
  }
  check(plist.TeamIdentifier?.[0] === EXPECTED.team &&
    entitlements?.['application-identifier'] === `${EXPECTED.team}.${EXPECTED.bundle}` &&
    !plist.ProvisionedDevices && !plist.ProvisionsAllDevices && !entitlements['get-task-allow'], 'PROFILE_IS_NOT_SCOPED_APPSTORE');
  // Apple profiles are permission envelopes: '*' for iCloud services permits
  // CloudKit, while the local app entitlements above request only CloudKit and
  // exactly this container. The actual container permission must match exactly.
  check((includes(entitlements['com.apple.developer.icloud-services'], 'CloudKit') ||
      includes(entitlements['com.apple.developer.icloud-services'], '*')) &&
    includes(entitlements['com.apple.developer.icloud-container-identifiers'], EXPECTED.container) &&
    includes(entitlements['com.apple.developer.icloud-container-environment'], 'Production'), 'PROFILE_CLOUDKIT_MISSING');
  check(includes(entitlements['com.apple.developer.devicecheck.appattest-environment'], 'production'), 'PROFILE_APP_ATTEST_MISSING');
  check(entitlements['aps-environment'] === 'production', 'PROFILE_PUSH_MISSING');
  stage = 'store App Store profile in EAS';
  const { AppleProvisioningProfileMutation } = api('credentials/ios/api/graphql/mutations/AppleProvisioningProfileMutation');
  const storedProfile = await AppleProvisioningProfileMutation.createAppleProvisioningProfileAsync(graphqlClient, {
    appleProvisioningProfile: profile.provisioningProfile, developerPortalIdentifier: profile.provisioningProfileId,
  }, app.ownerAccount.id, identifier.id);
  check(storedProfile?.id, 'EAS_PROFILE_MISSING');
  console.log(JSON.stringify({ createdEasProfileId: storedProfile.id }));
  await unchanged();
  // These EAS setters are separate operations. If interrupted, leave the created
  // objects available in EAS for review; do not auto-retry generation or revoke.
  const { IosAppBuildCredentialsMutation } = api('credentials/ios/api/graphql/mutations/IosAppBuildCredentialsMutation');
  stage = 'assign App Store certificate';
  await IosAppBuildCredentialsMutation.setDistributionCertificateAsync(graphqlClient, build.id, storedCert.id);
  stage = 'assign App Store profile';
  await IosAppBuildCredentialsMutation.setProvisioningProfileAsync(graphqlClient, build.id, storedProfile.id);
  stage = 'verify assigned App Store credentials';
  const final = await readCredentials(createGraphqlClient(authentication));
  const finalBuild = final?.iosAppBuildCredentialsList?.[0];
  check(final?.iosAppBuildCredentialsList?.length === 1 && finalBuild?.id === build.id &&
    finalBuild.distributionCertificate?.id === storedCert.id && finalBuild.provisioningProfile?.id === storedProfile.id,
  'FINAL_ASSIGNMENT_MISMATCH');
  console.log('App Store signing renewed and production CloudKit, App Attest, and push entitlements verified.');
}

main().catch(error => {
  // Do not print dependency error messages/stacks; they can contain request data.
  const kind = /^[A-Za-z][A-Za-z0-9_]{0,70}$/.test(error?.name ?? '') ? error.name : 'Error';
  console.error(`Stopped during ${stage}: ${error.safeCode ?? kind}. Created objects, if any, remain available for review; no automatic retry or revocation.`);
  process.exitCode = 1;
});
