// import GetTextEmbedding from "../src/agent/TextEmbedding";

// async function testGetTextEmbedding() {
//     const text = "This is a test text.";
//     const embedding = await GetTextEmbedding(text);
//     console.log(embedding);
// }
// testGetTextEmbedding();
import GetImageEmbedding from "../src/agent/ImageEmbedding";
async function test() {
    const reslut = await GetImageEmbedding("https://i.imgur.com/RKsLoNB.png")
    console.log(reslut);
}
test()