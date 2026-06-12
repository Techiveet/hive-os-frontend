import { ModuleConfig } from '../types';
import { B2BRoutes } from './routes';

export const B2BMarketplaceModule: ModuleConfig = {
    id: 'b2b-marketplace',
    name: 'B2B Marketplace',
    description: 'Wholesale B2B operations and sourcing',
    routes: B2BRoutes,
};
