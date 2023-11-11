// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as nrc from "node-run-cmd";

const docker = {
  container: {
    ls: async (): Promise<any[]> => {
      let output = "";

      await nrc.run("docker container ls", {
        onData: (data: any) => {
          output += data;
        }
      });

      return output
        .split("\n")
        .filter(r => r)
        .reduce((acc, next, idx, arr) => {
          if (idx === 0) {
            return acc; // First line is column names.
          }

          const names = arr[0].split(/\s{2,}/i);
          const values = next.split(/\s{2,}/i);

          const container = {};
          for (let i = 0; i < names.length; ++i) {
            (container as any)[names[i]] = values[Math.min(i, values.length - 1)];
          }
          acc.push(container);

          return acc;
        }, new Array<any>());
    }
  }
};

export default docker;
