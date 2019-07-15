import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import MemberTypes from "./MemberTypes";

class ParsedPhpClass {
  public name: string;
  public properties: MemberTypes = new MemberTypes();
  public methods: MemberTypes = new MemberTypes();
}

function parsePhpToObject(phpClass: string): ParsedPhpClass {
  const parsed = new ParsedPhpClass();

  const propertyRegex = /(public|protected|private) \$(.*) (?==)/g;
  let propertyMatches = propertyRegex.exec(phpClass);

  while (propertyMatches != null) {
    parsed.properties[propertyMatches[1]].push(propertyMatches[2]);
    propertyMatches = propertyRegex.exec(phpClass);
  }

  const methodRegex = /(public|protected|private) (.*function) (.*)(?=\()/g;
  let methodMatches = methodRegex.exec(phpClass);

  while (methodMatches != null) {
    parsed.methods[methodMatches[1]].push(methodMatches[3]);
    methodMatches = methodRegex.exec(phpClass);
  }

  return parsed;
}

export default async function parse(filePath: string) {
  const phpClassAsString = await new Promise<string>((resolve, reject) => {
    fs.readFile(filePath, null, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.toString("utf8"));
      }
    });
  });

  const parsed = parsePhpToObject(phpClassAsString);
  parsed.name = path.basename(filePath, ".php");

  return parsed;
}
