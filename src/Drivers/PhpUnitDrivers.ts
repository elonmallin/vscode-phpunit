"use strict";

import Command from "./CommandDriver";
import Composer from "./ComposerDriver";
import DockerContainer from "./DockerContainerDriver";
import Docker from "./DockerDriver";
import GlobalPhpUnit from "./GlobalPhpUnitDriver";
import Legacy from "./LegacyDriver";
import Path from "./PathDriver";
import Phar from "./PharDriver";
import Ssh from "./SshDriver";

export default {
  Command,
  Composer,
  Docker,
  DockerContainer,
  GlobalPhpUnit,
  Legacy,
  Path,
  Phar,
  Ssh
};
