import { createApp, lakebase, server } from '@databricks/appkit';
import { setupDeliveryRoutes } from './routes/lakebase/delivery-routes';

createApp({
  plugins: [
    server({ autoStart: false }),
    lakebase(),
  ],
})
  .then(async (appkit) => {
    await setupDeliveryRoutes(appkit);
    await appkit.server.start();
  })
  .catch(console.error);
