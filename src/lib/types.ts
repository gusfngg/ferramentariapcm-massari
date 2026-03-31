export type EmployeeRole = 'mechanic' | 'admin';
export type ToolCondition = 'good' | 'fair' | 'maintenance';
export type WithdrawalStatus = 'active' | 'returned';
export type ToolCategory = 'hand' | 'power' | 'measuring' | 'electrical' | 'cutting';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  badge: string;
  password: string;
  department: string;
  shift: 'A' | 'B' | 'C';
  photoUrl?: string;
}

export type PublicEmployee = Omit<Employee, 'password'>;

export type ImageUploadInput = {
  photoFile?: File | null;
  removePhoto?: boolean;
};

export type EmployeeSaveInput = Partial<Employee> & ImageUploadInput;

export interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
  code: string;
  description: string;
  available: boolean;
  condition: ToolCondition;
  location: string;
  photoUrl?: string;
}

export type ToolSaveInput = Partial<Tool> & ImageUploadInput;

export interface Withdrawal {
  id: string;
  toolId: string;
  employeeId: string;
  withdrawnAt: string;
  expectedReturnAt?: string;
  returnedAt?: string;
  status: WithdrawalStatus;
  costCenter?: string;
  notes?: string;
}

export interface Database {
  employees: Employee[];
  tools: Tool[];
  withdrawals: Withdrawal[];
}
