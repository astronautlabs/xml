import { AppInfo } from "./app-info";
import { Documentation } from "./documentation";

export interface Annotation {
    documentation: Documentation[];
    appInfo: AppInfo[];
}
