import { RouteRecordRaw } from 'vue-router';
// Or React router depending on the framework, wait it's a React/Next or React/Vite app.
// Let's use generic objects if it's custom. Actually hive-os-frontend uses standard react-router objects.
export const B2BRoutes = [
    {
        path: '/b2b/buyer',
        component: () => import('./pages/BuyerDashboard'),
    },
    {
        path: '/b2b/seller',
        component: () => import('./pages/SellerDashboard'),
    }
];
