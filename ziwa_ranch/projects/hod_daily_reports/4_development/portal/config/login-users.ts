export interface LoginUser {
  username: string
  displayName: string
}

export interface LoginDepartment {
  label: string
  slug: string
  users: LoginUser[]
}

export const LOGIN_DEPARTMENTS: LoginDepartment[] = [
  { label: 'Main Gate', slug: 'main-gate', users: [
    { username: 'maingate.jjuko', displayName: 'Jjuko' },
  ]},
  { label: 'HQ Reception', slug: 'hq-reception', users: [
    { username: 'reception.emilly', displayName: 'Emilly' },
    { username: 'reception.patience', displayName: 'Patience' },
    { username: 'reception.carol', displayName: 'Carol' },
  ]},
  { label: 'Food & Beverage', slug: 'food-and-beverage', users: [
    { username: 'fnb.howard', displayName: 'Howard' },
    { username: 'fnb.oscar', displayName: 'Oscar' },
  ]},
  { label: 'Kitchen', slug: 'kitchen', users: [
    { username: 'kitchen.sensio', displayName: 'Sensio' },
    { username: 'kitchen.richard', displayName: 'Richard' },
    { username: 'kitchen.safari', displayName: 'Safari' },
  ]},
  { label: 'Housekeeping', slug: 'housekeeping', users: [
    { username: 'housekeeping.anita', displayName: 'Anita' },
  ]},
  { label: 'Security', slug: 'security', users: [
    { username: 'security.salim', displayName: 'Salim' },
    { username: 'security.elia', displayName: 'Elia' },
  ]},
  { label: 'Store', slug: 'store', users: [
    { username: 'store.denis', displayName: 'Denis' },
  ]},
  { label: 'Accounts', slug: 'accounts', users: [
    { username: 'accounts.musoni', displayName: 'Musoni' },
    { username: 'accounts.halima', displayName: 'Halima' },
  ]},
  { label: 'Electrical', slug: 'electrical', users: [
    { username: 'electrical.robert', displayName: 'Robert' },
    { username: 'electrical.sekito', displayName: 'Sekito' },
  ]},
  { label: 'HQ Maintenance', slug: 'hq-maintenance', users: [
    { username: 'maintenance.david', displayName: 'David' },
    { username: 'maintenance.francis', displayName: 'Francis' },
  ]},
  { label: 'Drivers & Mechanics', slug: 'drivers-and-mechanics', users: [
    { username: 'drivers.kanja', displayName: 'Kanja' },
    { username: 'drivers.roger', displayName: 'Roger' },
  ]},
  { label: 'Plumbing', slug: 'plumbing', users: [
    { username: 'plumbing.richard', displayName: 'Richard' },
    { username: 'plumbing.jonah', displayName: 'Jonah' },
  ]},
  { label: 'IT', slug: 'it', users: [
    { username: 'it.benson', displayName: 'Benson' },
  ]},
  { label: 'Wildlife', slug: 'wildlife', users: [
    { username: 'wildlife.martine', displayName: 'Martine' },
    { username: 'wildlife.wycliffe', displayName: 'Wycliffe' },
    { username: 'wildlife.samuel', displayName: 'Samuel' },
  ]},
  { label: 'Craft Shop', slug: 'craft-shop', users: [
    { username: 'craftshop.halima', displayName: 'Halima' },
    { username: 'craftshop.patience', displayName: 'Patience' },
  ]},
  { label: 'Head Office', slug: 'head-office', users: [
    { username: 'headoffice.florence', displayName: 'Florence' },
    { username: 'headoffice.julie', displayName: 'Julie' },
    { username: 'headoffice.isaac', displayName: 'Isaac' },
    { username: 'headoffice.faith', displayName: 'Faith' },
  ]},
]
