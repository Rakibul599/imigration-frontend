export type Service = {
  id: string;
  title: string;
  description: string;
  image: string;
  tag?: string;
};

export const services: Service[] = [
  {
    id: 'special-pass',
    title: 'Special Pass',
    description: 'Apply and manage your special pass',
    image: '/images/special-pass.png',
    tag: 'Popular',
  },
  {
    id: 'your-information',
    title: 'Your Information',
    description: 'Update your personal information',
    image: '/images/your-information.svg',
  },
  {
    id: 'registration-document',
    title: 'Registration Document',
    description: 'View your registration details',
    image: '/images/registration-document.svg',
  },
  {
    id: 'medical-information',
    title: 'Medical Information',
    description: 'Manage your medical records',
    image: '/images/medical-information.svg',
  },
  {
    id: 'insurance-information',
    title: 'Insurance Information',
    description: 'Keep your insurance details up to date',
    image: '/images/insurance-information.svg',
  },
  {
    id: 'socso-information',
    title: 'SOCSO Information',
    description: 'Access your SOCSO contribution details',
    image: '/images/socso.png',
  },
  {
    id: 'epf-information',
    title: 'EPF Information',
    description: 'View your EPF account information',
    image: '/images/epf-kwsp.svg',
  },
  {
    id: 'work-agreement-information',
    title: 'Work Agreement Information',
    description: 'Review your employment agreement',
    image: '/images/work-agreement.svg',
  },
  {
    id: 'payment-information',
    title: 'Payment Information',
    description: 'Manage fees and payment history',
    image: '/images/payment-information.svg',
  },
  {
    id: 'work-information',
    title: 'Work Information',
    description: 'View your current work information',
    image: '/images/work-information.svg',
  },
];
