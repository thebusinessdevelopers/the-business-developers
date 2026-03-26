export interface Room {
  name: string
  slug: string
}

export interface RoomBuilding {
  building: string
  rooms: Room[]
}

export const ROOM_BUILDINGS: RoomBuilding[] = [
  {
    building: 'Guest House 1',
    rooms: [
      { name: 'Augustu', slug: 'augustu' },
      { name: 'Obama', slug: 'obama' },
      { name: 'Sonic', slug: 'sonic' },
      { name: 'Malaika', slug: 'malaika' },
      { name: 'Nguzo', slug: 'nguzo' },
    ],
  },
  {
    building: 'Guest House 2',
    rooms: [
      { name: 'Lavender', slug: 'lavender' },
      { name: 'Iris', slug: 'iris' },
      { name: 'Violet', slug: 'violet' },
      { name: 'Orange', slug: 'orange' },
      { name: 'Neem Tree', slug: 'neem_tree' },
      { name: 'Neem Tree Dorm', slug: 'neem_tree_dorm' },
    ],
  },
  {
    building: 'Chalets',
    rooms: [
      { name: 'Karungi (1)', slug: 'karungi' },
      { name: 'Barungi (2)', slug: 'barungi' },
      { name: 'Kirungi (3)', slug: 'kirungi' },
      { name: 'Murungi (4)', slug: 'murungi' },
      { name: 'The Family (5)', slug: 'the_family' },
      { name: 'The Clan (6)', slug: 'the_clan' },
      { name: 'The Tribe (7)', slug: 'the_tribe' },
    ],
  },
  {
    building: 'Tents',
    rooms: [
      { name: 'Pundamilia', slug: 'pundamilia' },
      { name: 'Twiga', slug: 'twiga' },
    ],
  },
]

export const ALL_ROOMS: Room[] = ROOM_BUILDINGS.flatMap((b) => b.rooms)
