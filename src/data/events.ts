import { CityEvent } from '../types';

export const RANDOM_EVENTS: Omit<CityEvent, 'remainingSeconds'>[] = [
  {
    id: 'traffic_jam',
    title: 'Downtown Traffic Gridlock',
    description: 'A major collision and rush hour have caused heavy congestion on the city avenues.',
    icon: '🚗',
    type: 'negative',
    durationSeconds: 45,
    effects: {
      trafficModifier: 35,
      happinessModifier: -10,
    },
  },
  {
    id: 'power_outage',
    title: 'Grid Substation Malfunction',
    description: 'An electrical surge knocked out local substations. Power capacity is temporarily halved!',
    icon: '⚡',
    type: 'negative',
    durationSeconds: 35,
    effects: {
      powerOutage: true,
      happinessModifier: -15,
    },
  },
  {
    id: 'festival',
    title: 'City Street Festival & Carnival',
    description: 'Street performers, food trucks, and music bands fill the streets! Citizens are euphoric.',
    icon: '🎉',
    type: 'positive',
    durationSeconds: 60,
    effects: {
      happinessModifier: 25,
      incomeModifier: 1.3,
    },
  },
  {
    id: 'heavy_rain',
    title: 'Nourishing Monsoon Rain',
    description: 'A soothing summer thunderstorm fills city water reservoirs and clears urban smog.',
    icon: '🌧️',
    type: 'neutral',
    durationSeconds: 40,
    effects: {
      happinessModifier: 5,
    },
  },
  {
    id: 'business_boom',
    title: 'Venture Capital & Business Boom',
    description: 'Investors pour capital into local shops and offices! Tax revenues jump by 50%.',
    icon: '📈',
    type: 'positive',
    durationSeconds: 60,
    effects: {
      incomeModifier: 1.5,
    },
  },
  {
    id: 'population_growth',
    title: 'Immigration Wave',
    description: 'Media praises your city quality of life! Families flock to fill available houses.',
    icon: '👶',
    type: 'positive',
    durationSeconds: 50,
    effects: {
      happinessModifier: 10,
      bonusMoney: 1500,
    },
  },
  {
    id: 'construction_bonus',
    title: 'Federal Infrastructure Grant',
    description: 'City hall receives a regional subsidy: all roads and buildings cost 30% less!',
    icon: '🏗️',
    type: 'positive',
    durationSeconds: 60,
    effects: {
      constructionDiscount: 0.3,
    },
  },
];
