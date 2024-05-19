const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function getRepoContent(owner, repo, path) {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
  });

  let files = [];
  for (let item of data) {
    if (item.path.includes(".vitepress") || item.path.includes(".svg")) {
      continue;
    }
    if (item.type === "dir") {
      files = files.concat(await getRepoContent(owner, repo, item.path));
    } else if (item.type === "file") {
      files.push({ name: item.name, path: item.path });
    }
  }

  return files;
}

async function findMissingDocs() {
  const frameworkFiles = await getRepoContent("yuiphp", "core", "src");
  const docsFiles = await getRepoContent("yuiphp", "api-docs", "docs");

  const missingDocs = frameworkFiles.filter(
    (file) =>
      !docsFiles.some(
        (docFile) => docFile.name === file.name.replace(".php", ".md")
      )
  );

  console.log("Missing docs:" + missingDocs.length + "\n");
  console.log(
    missingDocs
      .map((file) => {
        const parts = file.path.split("/");
        const coloredPath = parts
          .map((part, index) => {
            if (index === parts.length - 1) {
              // Colorir em amarelo
              return `\x1b[33m${part}\x1b[0m`;
            } else {
              // Colorir em ciano
              return `\x1b[36m${part}\x1b[0m`;
            }
          })
          .join("/");
        return coloredPath;
      })
      .join("\n")
  );
}

findMissingDocs().catch(console.error);
