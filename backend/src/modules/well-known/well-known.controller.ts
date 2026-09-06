import { Controller, Get, Header } from '@nestjs/common';

@Controller('.well-known')
export class WellKnownController {
  @Get('assetlinks.json')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=3600')
  getAssetLinks() {
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.zeitnahacademy.app',
          sha256_cert_fingerprints: [
            process.env.ANDROID_RELEASE_SHA256_FINGERPRINT ||
              'RELEASE_SHA256_FINGERPRINT_PLACEHOLDER_INSERT_FROM_KEYSTORE_OR_PLAY_CONSOLE_APP_SIGNING',
            process.env.ANDROID_DEBUG_SHA256_FINGERPRINT ||
              'DEBUG_SHA256_FINGERPRINT_PLACEHOLDER_INSERT_FROM_LOCAL_DEBUG_KEYSTORE',
          ],
        },
      },
    ];
  }

  @Get('apple-app-site-association')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=3600')
  getAppleAppSiteAssociation() {
    const teamId = process.env.APPLE_TEAM_ID || 'TEAMID';
    const appId = `${teamId}.com.zeitnahacademy.app`;

    return {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: [appId],
            components: [
              {
                '/': '/courses/*',
                comment: 'Matches course details and lessons',
              },
              {
                '/': '/community/*',
                comment: 'Matches community feed and direct messages',
              },
              {
                '/': '/auth/*',
                comment: 'Matches authentication and verify OTP',
              },
              {
                '/': '*',
                comment: 'Matches all other application routes',
              },
            ],
          },
        ],
      },
      webcredentials: {
        apps: [appId],
      },
    };
  }
}
