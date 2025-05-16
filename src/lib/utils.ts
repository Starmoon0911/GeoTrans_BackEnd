import type Image from "../types/Image";

import generateContent from "../agent/news/generateContent";
import generateImagesDescription from "../agent/news/generateImagesDescription";
import generateTitle from "../agent/news/generateTitle";
import { NewsItem } from "../types/NewsItem";

export async function UpdateNewsTitle(newsItem: NewsItem) {
    const { title, content } = newsItem;
    if (!newsItem.agent?.title) {
        const generatedTitle = await generateTitle(content, title);
        if (generatedTitle?.choices?.[0]?.message?.content) {
            console.log(`Generated title: ${generatedTitle.choices[0].message.content}`);
            newsItem.agent.title = generatedTitle.choices[0].message.content;
        } else {
            console.warn(`No valid content generated for title: ${title}`);
        }
    }
}

export async function UpdateImageDescriptions(images: Image[]): Promise<void> {
    for (const image of images) {
        if (!image.desc) {
            console.log(`Generating description for image: ${image.url}`);
            try {
                const generatedDescription = await generateImagesDescription(image.url);

                if (generatedDescription?.choices?.[0]?.message?.content) {
                    console.log(JSON.stringify(generatedDescription, null, 2));
                    image.desc = generatedDescription.choices[0].message.content;
                    console.log(`Description generated: ${image.desc}`);
                } else {
                    console.warn(`No valid content generated for image: ${image.url}`);
                }
            } catch (error) {
                console.error(`Error generating description for image: ${image.url}`, error);
            }
        }
    }
}

export async function generateNewsContent(newsItem) {
    if (!newsItem.agent?.content) {
        const generatedContent = await generateContent(newsItem.content, newsItem.images);
        if (generatedContent?.choices?.[0]?.message?.content) {
            console.log(`Generated content: ${generatedContent.choices[0].message.content}`);
            newsItem.agent.content = generatedContent.choices[0].message.content;
        }
    }
}