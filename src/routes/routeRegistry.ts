import { Router } from "express";
import { readdirSync } from "fs";
import { join } from "path";

class RouteRegistry {
    private mainRouter: Router = Router();

    constructor() {
        this.autoRegisterRoutes();
    }

    // Tự động quét và đăng ký tất cả routes trong thư mục
    private autoRegisterRoutes(): void {
        const routesPath = __dirname;
        const routeFiles = readdirSync(routesPath).filter(
            (file) =>
                (file.endsWith(".route.ts") || file.endsWith(".route.js")) &&
                file !== "index.ts" &&
                file !== "index.js"
        );

        routeFiles.forEach((file) => {
            const routeName = file.replace(/\.(route|routes)\.(ts|js)$/, "");
            const routePath = join(routesPath, file);

            // Dynamic import route module
            const routeModule = require(routePath);

            if (
                routeModule.default &&
                typeof routeModule.default === "function"
            ) {
                const apiPath = `/${routeName}`; // user.route.ts -> /users
                this.mainRouter.use(apiPath, routeModule.default);
            }
        });
    }

    // Lấy main router
    getRouter(): Router {
        return this.mainRouter;
    }
}

// Export singleton instance
export default new RouteRegistry();
