import * as vscode from "vscode";
import Composer from "./ComposerDriver";
import GlobalPhpUnit from "./GlobalPhpUnitDriver";
import IPhpUnitDriver from "./IPhpUnitDriver";
import Path from "./PathDriver";
import Phar from "./PharDriver";

const phpUnitPath = async (): Promise<string> => {
  let path: string;

  const config = vscode.workspace.getConfiguration("phpunit");
  const order = config.get<string[]>("driverPriority");
  const drivers = await getDrivers(order);

  for (const driver of drivers) {
    path = await driver.phpUnitPath();
    if (path) {
      return path;
    }
  }

  return null;
};

const getDrivers = (order?: string[]): IPhpUnitDriver[] => {
  const drivers: IPhpUnitDriver[] = [
    new Path(),
    new Composer(),
    new Phar(),
    new GlobalPhpUnit()
  ];

  function arrayUnique(array) {
    const a = array.concat();
    for (let i = 0; i < a.length; ++i) {
      for (let j = i + 1; j < a.length; ++j) {
        if (a[i] === a[j]) {
          a.splice(j--, 1);
        }
      }
    }

    return a;
  }
  order = arrayUnique((order || []).concat(drivers.map(d => d.name)));

  const sortedDrivers = drivers.sort((a, b) => {
    return order.indexOf(a.name) - order.indexOf(b.name);
  });

  return sortedDrivers;
};

export { phpUnitPath as resolvePhpUnitPath };
