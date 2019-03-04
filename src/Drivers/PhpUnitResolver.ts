import * as vscode from 'vscode';
import PhpUnitDriverInterface from "./PhpUnitDriverInterface";
import Path from "./PathDriver";
import Composer from "./ComposerDriver";
import Phar from "./PharDriver";
import GlobalPhpUnit from "./GlobalPhpUnitDriver";

const phpUnitPath = async (): Promise<string> => {
    let phpUnitPath: string;

    const config = vscode.workspace.getConfiguration('phpunit');
    const order = config.get<string[]>('driverPriority');
    const drivers = await getDrivers(order);

    for (let driver of drivers) {
        phpUnitPath = await driver.phpUnitPath();
        if (phpUnitPath) {
            return phpUnitPath;
        }
    }

    return null;
}

const getDrivers = (order?: string[]): PhpUnitDriverInterface[] => {
    const drivers: PhpUnitDriverInterface[] = [
        new Path(),
        new Composer(),
        new Phar(),
        new GlobalPhpUnit(),
    ];

    function arrayUnique(array) {
        var a = array.concat();
        for(var i=0; i<a.length; ++i) {
            for(var j=i+1; j<a.length; ++j) {
                if(a[i] === a[j])
                    a.splice(j--, 1);
            }
        }
    
        return a;
    }
    order = arrayUnique((order || []).concat(drivers.map(d => d.name)));

    const sortedDrivers = drivers.sort((a, b) => {
        return order.indexOf(a.name) - order.indexOf(b.name);
    });

    return sortedDrivers;
}

export {
    phpUnitPath as resolvePhpUnitPath
};
