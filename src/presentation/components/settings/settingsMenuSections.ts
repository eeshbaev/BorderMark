export type SettingsMenuItem = {
  label: string;
  route: `/backup` | `/export` | `/lock` | `/notifications` | `/privacy` | `/settings/appearance` | `/settings/date-format` | `/settings/default-country`;
};

export type SettingsMenuSection = {
  title: string;
  items: SettingsMenuItem[];
};

export const settingsMenuSections: SettingsMenuSection[] = [
  {
    title: 'Your Data',
    items: [
      { label: 'Backup & Restore', route: '/backup' },
      { label: 'Export', route: '/export' },
    ],
  },
  {
    title: 'Privacy & Security',
    items: [
      { label: 'App Lock', route: '/lock' },
      { label: 'Notifications', route: '/notifications' },
      { label: 'Privacy', route: '/privacy' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Appearance', route: '/settings/appearance' },
      { label: 'Date format', route: '/settings/date-format' },
      { label: 'Form default country', route: '/settings/default-country' },
    ],
  },
];
