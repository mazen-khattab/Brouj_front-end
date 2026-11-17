export interface StaffValues {
  name: string;
  email: string;
  phone: string;
  role: string;
}
export interface CreateStaffValues extends StaffValues {
  password: string;
}
