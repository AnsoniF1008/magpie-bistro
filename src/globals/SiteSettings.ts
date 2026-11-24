import type { GlobalConfig } from 'payload'
import { anyone, loggedIn, ownerOnlyField } from '../collections/access'
import { WEEKDAY_OPTIONS } from '../collections/MenuSlots'

const HHMM = (v: unknown) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v ?? '')) || 'Use 24h time like 11:30'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: { group: 'Settings' },
  access: { read: anyone, update: loggedIn },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hours',
          fields: [
            {
              name: 'manualClosed',
              type: 'checkbox',
              defaultValue: false,
              label: 'Closed today (holiday, sold out, emergency)',
              admin: { description: 'Turns the site to "Closed" and stops same-day orders until you untick it.' },
            },
            { name: 'closedMessage', type: 'text', label: 'Message while closed', admin: { placeholder: 'Closed for Thanksgiving — back Monday' } },
            { name: 'openWeekdays', type: 'select', hasMany: true, required: true, defaultValue: ['1', '2', '4', '5'], options: WEEKDAY_OPTIONS, label: 'Open days' },
            {
              type: 'row',
              fields: [
                { name: 'openTime', type: 'text', required: true, defaultValue: '11:30', validate: HHMM, label: 'Opens (24h)' },
                { name: 'closeTime', type: 'text', required: true, defaultValue: '16:30', validate: HHMM, label: 'Closes (24h)' },
              ],
            },
          ],
        },
        {
          label: 'Banner & photos',
          fields: [
            { name: 'bannerEn', type: 'text', label: 'Announcement banner', admin: { description: 'Shown at the top of every page. Leave empty to hide.' } },
            { name: 'bannerEs', type: 'text', admin: { hidden: true } },
            { name: 'heroImage', type: 'upload', relationTo: 'media', label: 'Home page photo' },
            { name: 'heroCaption', type: 'text', label: 'Caption under the home photo' },
            { name: 'cupcakeryImage', type: 'upload', relationTo: 'media', label: 'Cupcakery photo' },
          ],
        },
        {
          label: 'Orders & tax',
          fields: [
            { name: 'onlineOrdering', type: 'checkbox', defaultValue: true, label: 'Accept online pickup orders' },
            {
              name: 'taxRatePercent',
              type: 'number',
              required: true,
              defaultValue: 5.3,
              min: 0,
              max: 25,
              label: 'Sales tax (%)',
              access: { update: ownerOnlyField },
              admin: { step: 0.01, description: 'Combined rate charged at checkout. Confirm it with your accountant (state sales tax plus any local meals tax).' },
            },
            { name: 'cakeLeadDays', type: 'number', required: true, defaultValue: 3, min: 0, max: 60, label: 'Custom orders: days of notice needed', admin: { description: 'The custom order form will not accept an earlier date.' } },
            { name: 'notificationEmail', type: 'email', label: 'Send new-order emails to' },
          ],
        },
        {
          label: 'Contact',
          fields: [
            { name: 'phone', type: 'text', required: true, defaultValue: '(757) 339-2423', label: 'Phone' },
            { name: 'email', type: 'email', required: true, defaultValue: 'themagpiecupcakery@gmail.com', label: 'Email' },
            { name: 'addressLine1', type: 'text', required: true, defaultValue: '1604 S Church Street, Suite B', label: 'Address' },
            { name: 'addressLine2', type: 'text', required: true, defaultValue: 'Smithfield, VA 23430', label: 'City, state, ZIP' },
            { name: 'facebookUrl', type: 'text', defaultValue: 'https://www.facebook.com/p/The-Magpie-Bistro-Cupcakery-61556549097960/', label: 'Facebook page' },
            { name: 'instagramUrl', type: 'text', label: 'Instagram page' },
          ],
        },
      ],
    },
  ],
}
