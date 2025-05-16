import { Document, Types } from 'mongoose';
interface Feedback extends Document {
    reaction: {
        emoji: string;
        label: string;
    };
    comment: string;
    target: Types.ObjectId;    
    user?: Types.ObjectId;     
    metadata: {
        ip_hash: string;      
        user_agent?: string;
    };
}
