export interface User {
  id: string; name: string; email: string; phone: string; state: string;
  income: number; family: number; assets: string; bpl: boolean;
  status: 'approved' | 'pending' | 'rejected'; submitted: string;
}

export interface Sangha {
  id: string; name: string; email: string; phone: string; joined: string;
}

export interface PendingSangha {
  id: string; name: string; email: string; phone: string;
}

export const USERS: User[] = [
  { id:'U001', name:'Arjun Sharma',   email:'arjun@email.com',   phone:'+91 9876500001', state:'Karnataka',   income:480000, family:4, assets:'Own Home, Vehicle', bpl:false, status:'approved',  submitted:'2025-11-10' },
  { id:'U002', name:'Meena Patel',    email:'meena@email.com',   phone:'+91 9876500002', state:'Tamil Nadu',  income:320000, family:3, assets:'Rented',            bpl:false, status:'pending',   submitted:'2025-12-01' },
  { id:'U003', name:'Rahul Gupta',    email:'rahul@email.com',   phone:'+91 9876500003', state:'Delhi',       income:750000, family:5, assets:'Own Home, Land',    bpl:false, status:'pending',   submitted:'2025-12-05' },
  { id:'U004', name:'Sunita Devi',    email:'sunita@email.com',  phone:'+91 9876500004', state:'West Bengal', income:210000, family:2, assets:'Rented',            bpl:true,  status:'rejected',  submitted:'2025-11-20' },
  { id:'U005', name:'Vikram Nair',    email:'vikram@email.com',  phone:'+91 9876500005', state:'Kerala',      income:560000, family:4, assets:'Own Home',          bpl:false, status:'pending',   submitted:'2025-12-08' },
  { id:'U006', name:'Lakshmi Iyer',   email:'lakshmi@email.com', phone:'+91 9876500006', state:'Tamil Nadu',  income:390000, family:3, assets:'Vehicle',           bpl:false, status:'pending',   submitted:'2025-12-02' },
  { id:'U007', name:'Deepak Rao',     email:'deepak@email.com',  phone:'+91 9876500007', state:'Karnataka',   income:920000, family:3, assets:'Own Home, Vehicle', bpl:false, status:'approved',  submitted:'2025-11-05' },
  { id:'U008', name:'Fathima Begum',  email:'fathima@email.com', phone:'+91 9876500008', state:'Telangana',   income:290000, family:6, assets:'Own Home',          bpl:false, status:'approved',  submitted:'2025-10-28' },
];

export const SANGHA_LIST: Sangha[] = [
  { id:'S001', name:'Priya Verma',    email:'priya@sangha.com',  phone:'+91 9876501234', joined:'2024-03-15' },
  { id:'S002', name:'Ravi Das',       email:'ravi@sangha.com',   phone:'+91 9876502345', joined:'2024-05-20' },
  { id:'S003', name:'Anita Singh',    email:'anita@sangha.com',  phone:'+91 9876503456', joined:'2024-01-10' },
  { id:'S004', name:'Mohammed Irfan', email:'irfan@sangha.com',  phone:'+91 9876504567', joined:'2024-07-01' },
  { id:'S005', name:'Rekha Krishnan', email:'rekha@sangha.com',  phone:'+91 9876505678', joined:'2024-09-12' },
];

export const PENDING_SANGHA: PendingSangha[] = [
  { id:'SN01', name:'Neha Kaur',   email:'neha@sangha.com',  phone:'+91 9999900001' },
  { id:'SN02', name:'Aryan Mehta', email:'aryan@sangha.com', phone:'+91 9999900002' },
];
