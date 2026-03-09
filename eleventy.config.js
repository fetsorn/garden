export default async function(eleventyConfig) {
    eleventyConfig.ignores.add("README.md");
    eleventyConfig.ignores.add("CLAUDE.md");
    eleventyConfig.ignores.add("plans/");

    // static assets → _site/
    eleventyConfig.addPassthroughCopy("index.css");
    eleventyConfig.addPassthroughCopy("img");
};
