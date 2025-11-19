import { Schema } from "mongoose";
import NewsSchema from './schemas/news'
import FeedbackSchema from './schemas/feedback'
export const schemas: Record<string, Record<string, any>> = {
  News: NewsSchema,
  Feedback: FeedbackSchema,
};
