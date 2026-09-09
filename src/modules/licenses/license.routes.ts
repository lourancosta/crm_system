import { Router } from 'express';
import { createLicense, deleteLicense, getLicense, listLicenseCompanies, listLicenses, updateLicense } from './license.controller';
import { requireModule } from '../../middlewares/authorize';

export const licenseRoutes = Router();

licenseRoutes.get('/', requireModule('licenses', 'view'), listLicenses);
licenseRoutes.post('/', requireModule('licenses', 'create'), createLicense);
licenseRoutes.get('/:id/companies', requireModule('licenses', 'view'), listLicenseCompanies);
licenseRoutes.get('/:id', requireModule('licenses', 'view'), getLicense);
licenseRoutes.put('/:id', requireModule('licenses', 'edit'), updateLicense);
licenseRoutes.delete('/:id', requireModule('licenses', 'delete'), deleteLicense);
