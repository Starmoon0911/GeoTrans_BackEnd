import type Image from "./Image";
import type agent from './agent'
export interface NewsItem {
    title: string;
    link: string;
    date: Date;
    description?: string;
    content?: string;
    images?: Image[];
    agent?: agent;
}
