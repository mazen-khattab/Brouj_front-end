import { useContext } from 'react';
import { AccountDataContext } from '../Context/AccountDataContext';
import { CustomerActionContext } from '../Context/CustomerActionContext';
export function useAccountData() { const value = useContext(AccountDataContext); if (!value) throw new Error('AccountDataProvider is required.'); return value; }
export function useCustomerAction() { const value = useContext(CustomerActionContext); if (!value) throw new Error('CustomerActionProvider is required.'); return value; }
