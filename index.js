import { Octokit } from "@octokit/rest";
import { promises as fs } from "fs";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

let logFile = "./logs.txt";

/**
 * Get the content of a repository
 * @param {string} owner The owner of the repository
 * @param {string} repo The name of the repository
 * @param {string} path The path to the directory
 */
async function getRepoContent(owner, repo, path) {
  const { data } = await octokit.repos.getContent({ owner, repo, path });

  const files = [];
  const dirPromises = [];

  for (let item of data) {
    if (item.path.includes(".vitepress") || item.path.includes(".svg")) {
      continue;
    }
    if (item.type === "dir") {
      dirPromises.push(getRepoContent(owner, repo, item.path));
    } else if (item.type === "file") {
      files.push({ name: item.name, path: item.path });
    }
  }

  const dirFiles = await Promise.all(dirPromises);
  for (const dirFile of dirFiles) {
    files.push(...dirFile);
  }

  return files;
}

/**
 * Find missing docs
 * @returns {Promise<void>}
*/
async function findMissingDocs() {
  const [frameworkFiles, docsFiles] = await Promise.all([
    getRepoContent("yuiphp", "core", "src"),
    getRepoContent("yuiphp", "api-docs", "docs"),
  ]);

  const docsFilesSet = new Set(docsFiles.map((file) => file.name));

  const missingDocs = frameworkFiles.filter(
    (file) => !docsFilesSet.has(file.name.replace(".php", ".md"))
  );

  let consoleOutput = missingDocs
    .map((file) => {
      const parts = file.path.split("/");
      const coloredPath = parts
        .map((part, index) => {
          if (index === parts.length - 1) {
            return `\x1b[33m${part}\x1b[0m`;
          } else {
            return `\x1b[36m${part}\x1b[0m`;
          }
        })
        .join("/");
      return coloredPath;
    })
    .join("\n");

  let output = new Date().toLocaleString() + "\nMissing docs:\n" + missingDocs.map((file) => file.path).join("\n") + "\n";

  console.log("Missing docs:" + missingDocs.length + "\n");
  console.log(consoleOutput);

  await fs.writeFile(logFile, output);
}

findMissingDocs().catch(console.error);

setInterval(function(){
  findMissingDocs().catch(console.error);
}, 14400000);