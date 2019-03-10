import * as nrc from "node-run-cmd";

const docker = {
  container: {
    ls: async (): Promise<any[]> => {
      let output: string = "";

      await nrc.run("docker container ls", {
        onData: data => {
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
            container[names[i]] = values[Math.min(i, values.length - 1)];
          }
          acc.push(container);

          return acc;
        }, []);
    }
  }
};

export default docker;
