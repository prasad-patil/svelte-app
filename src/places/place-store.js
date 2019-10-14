import { writable } from 'svelte/store';
const places = writable([
  {
    id: 'm1',
    name: 'Sinhgad',
    type: 'historical (fort)',
    description:
      'Sinhagad is a hill fortress located at around 35 km southwest of the city of Pune, India.',
    imageUrl:
      'https://www.hindujagruti.org/wp-content/uploads/2015/02/Kondana_Sinhagarh_Fort_640.jpg',
    address: 'Fortress in Thoptewadi, Maharashtra',
    contactEmail: 'code@test.com',
    isFavorite: false
  },
  {
    id: 'm2',
    name: 'Lonawala',
    type: 'Hill Station (nature)',
    description:
      'Lonavala is a hill station surrounded by green valleys in western India near Mumbai.',
    imageUrl:
      'https://media-cdn.tripadvisor.com/media/photo-s/18/81/c8/ff/lonavla-hill-station.jpg',
    address: 'Town in Maharashtra',
    contactEmail: 'swim@test.com',
    isFavorite: true
  }
]);

const placeStore = {
  subscribe: places.subscribe,
  setPlaces: placesArray => {
    places.set(placesArray);
  },
  addPlaces: placesData => {
    const newPlace = {
      ...placesData
    };
    places.update(items => {
      return [newPlace, ...items];
    });
  },
  updatePlace: (id, place) => {
    places.update(items => {
      const placesIndex = items.findIndex(i => i.id === id);
      const updatedPlace = { ...items[placesIndex], ...place };
      const updatedPlaces = [...items];
      updatedPlaces[placesIndex] = updatedPlace;
      return updatedPlaces;
    });
  },
  removePlace: id => {
    places.update(items => {
      return items.filter(i => i.id !== id);
    });
  },
  toggleFavorite: id => {
    places.update(items => {
      const updatedPlace = { ...items.find(m => m.id === id) };
      updatedPlace.isFavorite = !updatedPlace.isFavorite;
      const placesIndex = items.findIndex(m => m.id === id);
      const updatedPlaces = [...items];
      updatedPlaces[placesIndex] = updatedPlace;
      return updatedPlaces;
    });
  }
};

export default placeStore;
