// src/data/mockData.ts

/* ================= TYPES ================= */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;

  state: string;
  income: number;
  family: number;
  assets: string;
  bpl: boolean;
  status: 'approved' | 'pending' | 'rejected';
  submitted: string;

  /* PERSONAL */
  fathersName?: string;
  mothersName?: string;
  mothersMaidenName?: string;
  spouseName?: string;
  wifesMaidenName?: string;
  surnameInUse?: string;
  surnameAsPerGotra?: string;

  /* RELIGIOUS */
  gotra?: string;
  kuladevata?: string;
  priestName?: string;
  priestLocation?: string;

  /* EDUCATION */
  highestQualification?: string;
  institution?: string;

  /* PROFESSIONAL */
  occupation?: string;
  employer?: string;
  professionType?: string;

  /* LOCATION */
  currentCity?: string;
  currentState?: string;
  currentPincode?: string;

  homeAddress?: string;
  homeBuilding?: string;
  homeStreet?: string;
  homeCity?: string;
  homeState?: string;
  homePincode?: string;

  /* FAMILY */
  familyType?: string;
  familyMembersCount?: string;

  /* EXTRA */
  languages?: string[];
  /* APPROVAL */
approvedDate?: string;
approvedBy?: string;

/* REJECTION */
rejectedDate?: string;
rejectedBy?: string;

/* EXTRA ECONOMIC */
selfIncome?: number;
familyIncome?:number;
houseType?: string;
vehicle?: string[];

healthInsurance?: string;
lifeInsurance?: string;
termInsurance?: string;

rationCard?: string;
aadhaar?: string;
pan?: string;
records?: string;

investments?: string[];
}

export interface Sangha {
  id: string;
  name: string;
  email: string;
  phone: string;
  joined: string;
  city?: string;
  state?: string;
  pincode?: string;
  income?: number;
  assets?: string;
  bpl?: boolean;
  status?: 'approved' | 'pending' | 'rejected';
  submitted?: string;
  approvedDate?: string;
  approvedBy?: string;
  rejectedDate?: string;

  addressLine1?: string;
addressLine2?: string;
addressLine3?: string;
taluk?: string;
floorNumber?: string;
country?: string;

officePhone?: string;
officeEmail?: string;

description?: string;
logo?: string;
}

/* ================= USERS ================= */

export const USERS: User[] = [
  {
    id: 'U001',
    name: 'Arjun Sharma',
    email: 'arjun@email.com',
    phone: '+91 9876500001',
    state: 'Karnataka',
    income: 480000,
    family: 4,
    assets: 'Own Home, Car',
    bpl: false,
    status: 'approved',
    submitted: '2025-11-10',
    approvedDate: '2025-11-12',
    approvedBy: 'Admin',
    languages: ['Kannada', 'English', 'Hindi'],
    surnameAsPerGotra: 'Sharma',
    mothersMaidenName: 'Patil',
    wifesMaidenName: 'Kulkarni',
    professionType: 'Private Job',
    selfIncome: 300000,
    familyIncome: 480000,
  },

  {
    id: 'U002',
    name: 'Meena Patel',
    email: 'meena@email.com',
    phone: '+91 9876500002',
    state: 'Tamil Nadu',
    income: 320000,
    family: 3,
    assets: 'Rented House',
    bpl: false,
    status: 'pending',
    submitted: '2025-12-01',
    languages: ['Kannada', 'English'],
    surnameAsPerGotra: 'Patel',
    mothersMaidenName: 'Desai',
    professionType: 'Teacher',
    selfIncome: 200000,
    familyIncome: 320000,
  },

  {
    id: 'U003',
    name: 'Rahul Gupta',
    email: 'rahul@email.com',
    phone: '+91 9876500003',
    state: 'Delhi',
    income: 750000,
    family: 5,
    assets: 'Own Home, Land',
    bpl: false,
    status: 'approved',
    submitted: '2025-11-15',
    approvedDate: '2025-11-18',
    approvedBy: 'Admin',
    languages: ['Hindi', 'English'],
    surnameAsPerGotra: 'Gupta',
    mothersMaidenName: 'Agarwal',
    wifesMaidenName: 'Singh',
    professionType: 'Business',
    selfIncome: 500000,
    familyIncome: 750000,
  },

  {
    id: 'U004',
    name: 'Sunita Devi',
    email: 'sunita@email.com',
    phone: '+91 9876500004',
    state: 'West Bengal',
    income: 210000,
    family: 2,
    assets: 'Rented',
    bpl: true,
    status: 'rejected',
    submitted: '2025-11-20',
    rejectedDate: '2025-11-22',
    rejectedBy: 'Admin',
    languages: ['Hindi'],
    surnameAsPerGotra: 'Devi',
    mothersMaidenName: 'Kumari',
  },
];
export const BLOCKED_USERS: User[] = [
  {
    id: 'U900',
    name: 'Blocked User 1',
    email: 'blocked1@email.com',
    phone: '+91 9000000001',
    state: 'Karnataka',
    income: 200000,
    family: 3,
    assets: 'Rented House',
    bpl: true,
    status: 'rejected',
    submitted: '2025-10-01',
    rejectedDate: '2025-10-03',
    rejectedBy: 'Admin',
  },
  {
    id: 'U901',
    name: 'Blocked User 2',
    email: 'blocked2@email.com',
    phone: '+91 9000000002',
    state: 'Tamil Nadu',
    income: 250000,
    family: 4,
    assets: 'Own House',
    bpl: false,
    status: 'rejected',
    submitted: '2025-10-05',
    rejectedDate: '2025-10-07',
    rejectedBy: 'Admin',
  },
];
export const DELETED_USERS: User[] = [
  {
    id: 'U902',
    name: 'Deleted User 1',
    email: 'deleted1@email.com',
    phone: '+91 9000000011',
    state: 'Karnataka',
    income: 210000,
    family: 2,
    assets: 'Rented',
    bpl: true,
    status: 'rejected',
    submitted: '2025-09-01',
    rejectedDate: '2025-09-02',
    rejectedBy: 'Admin',
  },
  {
    id: 'U903',
    name: 'Deleted User 2',
    email: 'deleted2@email.com',
    phone: '+91 9000000012',
    state: 'Maharashtra',
    income: 300000,
    family: 5,
    assets: 'Own House, Vehicle',
    bpl: false,
    status: 'rejected',
    submitted: '2025-09-10',
    rejectedDate: '2025-09-12',
    rejectedBy: 'Admin',
  },
];

/* ================= SANGHA ================= */

export const SANGHA_LIST: Sangha[] = [
  {
    id: 'S001',
    name: 'Shree Ganesh Sangha',
    email: 'ganesh@sangha.com',
    phone: '+91 9876501234',
    joined: '2024-03-15',

    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',

    status: 'approved',
    approvedDate: '2024-03-18',
    approvedBy: 'Admin',

    // 🔥 NEW (based on your form)
    addressLine1: '12, Ganesh Nilaya',
    addressLine2: 'MG Road',
    addressLine3: 'Near Metro Station',
    taluk: 'Central',
    floorNumber: '2',
    country: 'India',

    officePhone: '9876501234',
    officeEmail: 'office@ganesh.com',

    description: 'Community service and cultural activities',
    logo: 'ganesh.png',
  },

  {
    id: 'S002',
    name: 'Sri Rama Sangha',
    email: 'rama@sangha.com',
    phone: '+91 9123456780',
    joined: '2024-03-18',

    city: 'Mysuru',
    state: 'Karnataka',
    pincode: '570001',

    status: 'rejected',
    rejectedDate: '2024-03-20',

    addressLine1: '45, Rama Bhavan',
    addressLine2: 'Temple Street',
    addressLine3: 'Opp Bus Stand',
    taluk: 'South',
    floorNumber: '1',
    country: 'India',

    officePhone: '9123456780',
    officeEmail: 'office@rama.com',

    description: 'Religious and social welfare activities',
    logo: 'rama.png',
  },

  {
    id: 'S003',
    name: 'Shakti Women Sangha',
    email: 'shakti@sangha.com',
    phone: '+91 9988776655',
    joined: '2024-03-19',

    city: 'Hubballi',
    state: 'Karnataka',
    pincode: '580020',

    status: 'pending',
    submitted: '2024-03-19',

    addressLine1: '78, Shakti Complex',
    addressLine2: 'Market Road',
    addressLine3: 'Near Clock Tower',
    taluk: 'North',
    floorNumber: '3',
    country: 'India',

    officePhone: '9988776655',
    officeEmail: 'office@shakti.com',

    description: 'Women empowerment and training programs',
    logo: 'shakti.png',
  }
];
export const PENDING_SANGHA: Sangha[] = [
  {
    id: 'S201',
    name: 'vardhan',
    email: 'vardhan@sangha.com',
    phone: '+91 9999999999',
    joined: '2025-01-01',
    status: 'pending',
    submitted: '2025-01-01',
  },
];
/* ================= BLOCKED ================= */

export const BLOCKED_SANGHA: Sangha[] = [
  {
    id: 'S900',
    name: 'Blocked Sangha',
    email: 'blocked@sangha.com',
    phone: '+91 9000000101',
    joined: '2023-01-01',
    city: 'Mysuru',
    state: 'Karnataka',
    pincode: '570001',
    status: 'rejected',
  },
];

/* ================= DELETED ================= */

export const DELETED_SANGHA: Sangha[] = [
  {
    id: 'S901',
    name: 'Deleted Sangha',
    email: 'deleted@sangha.com',
    phone: '+91 9000000201',
    joined: '2022-01-01',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    status: 'rejected',
  },
];
export const USER_DISPLAY_NAMES: Record<string, string> = {
  U900: 'gaurav',
  U901: 'sam ',
  U902: 'raghav 1',
  U903: 'tejaswi 2',
};

export const SANGHA_DISPLAY_NAMES: Record<string, string> = {
  S900: 'saura',
  S901: 'aman',
};