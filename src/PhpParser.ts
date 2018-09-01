import * as vscode from 'vscode';
import * as fs from 'fs';

class MemberTypes {
    public private: string[] = [];
    public protected: string[] = [];
    public public: string[] = [];
}
class ParsedPhpClass {
    public name: string;
    public properties: MemberTypes = new MemberTypes();
    public methods: MemberTypes = new MemberTypes();
}

function parsePhpToObject(phpClass: string): ParsedPhpClass {
    let parsed = new ParsedPhpClass();

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

export default async function parse (filePath: string) {
    const phpClassAsString = await new Promise<string>((resolve, reject) => {
        fs.readFile(filePath, null, (err, data) => {
            if (err)
            {
                reject(err);
            }
            else
            {
                resolve(data.toString('utf8'));
            }
        });
    });

    let parsed = parsePhpToObject(phpClassAsString);
    parsed.name = filePath.match(/.*[\/\\](\w*).php$/i)[1];

    return parsed;
}