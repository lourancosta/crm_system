import { Router } from 'express';
import {
  createCompany,
  deleteCompany,
  getCompany,
  listCompanies,
  listCompanyCompanies,
  listCompanyContacts,
  listCompanyDeals,
  listCompanyInvoices,
  listCompanyLicenses,
  listCompanyTickets,
  updateCompany,
} from './company.controller';
import { requireModule } from '../../middlewares/authorize';

export const companyRoutes = Router();

companyRoutes.get('/', requireModule('companies', 'view'), listCompanies);
companyRoutes.post('/', requireModule('companies', 'create'), createCompany);
companyRoutes.get('/:id/companies', requireModule('companies', 'view'), listCompanyCompanies);
companyRoutes.get('/:id/contacts', requireModule('companies', 'view'), listCompanyContacts);
companyRoutes.get('/:id/deals', requireModule('companies', 'view'), listCompanyDeals);
companyRoutes.get('/:id/tickets', requireModule('companies', 'view'), listCompanyTickets);
companyRoutes.get('/:id/licenses', requireModule('companies', 'view'), listCompanyLicenses);
companyRoutes.get('/:id/invoices', requireModule('companies', 'view'), listCompanyInvoices);
companyRoutes.get('/:id', requireModule('companies', 'view'), getCompany);
companyRoutes.put('/:id', requireModule('companies', 'edit'), updateCompany);
companyRoutes.delete('/:id', requireModule('companies', 'delete'), deleteCompany);
