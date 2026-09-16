export type Company = {
  id: string;
  name: string;
  roc: string; // Registration of Companies number
  sector: string;
  description: string;
  logo: string;
  tag?: string;
  totalWorkers: number;
};

export const companies: Company[] = [
  {
    id: 'sime-darby',
    name: 'Sime Darby Plantation Berhad',
    roc: 'ROC-197001000284',
    sector: 'Agriculture & Plantation',
    description: 'Premier Malaysian agri-business and sustainable palm oil producer.',
    logo: '/images/companies/sime-darby.svg',
    tag: 'Govt Certified',
    totalWorkers: 14250,
  },
  {
    id: 'gamuda',
    name: 'Gamuda Berhad',
    roc: 'ROC-197601003632',
    sector: 'Infrastructure & Construction',
    description: 'Leading regional infrastructure, tunneling, and mass transit engineering group.',
    logo: '/images/companies/gamuda.svg',
    tag: 'Tier 1 Employer',
    totalWorkers: 8640,
  },
  {
    id: 'top-glove',
    name: 'Top Glove Corporation Bhd',
    roc: 'ROC-199801018294',
    sector: 'Manufacturing & Healthcare',
    description: 'World’s largest personal protection equipment and glove manufacturer.',
    logo: '/images/companies/top-glove.svg',
    tag: 'Verified JIM',
    totalWorkers: 11800,
  },
  {
    id: 'genting',
    name: 'Genting Malaysia Berhad',
    roc: 'ROC-198001004238',
    sector: 'Hospitality & Services',
    description: 'Integrated leisure, resort entertainment, and premier hospitality operations.',
    logo: '/images/companies/genting.svg',
    tag: 'Major Sponsor',
    totalWorkers: 7920,
  },
  {
    id: 'ioi-group',
    name: 'IOI Corporation Berhad',
    roc: 'ROC-196901000889',
    sector: 'Agri-Commodity & Processing',
    description: 'Leading international palm oil processing and resource-based industrial group.',
    logo: '/images/companies/ioi-group.svg',
    tag: 'Active Quota',
    totalWorkers: 9450,
  },
  {
    id: 'sunway',
    name: 'Sunway Construction Group',
    roc: 'ROC-201401032422',
    sector: 'Engineering & Development',
    description: 'Leading civil engineering, building contractor, and smart township developer.',
    logo: '/images/companies/sunway.svg',
    tag: 'Verified JIM',
    totalWorkers: 6830,
  },
];
