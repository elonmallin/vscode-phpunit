<?php

namespace Colors;

class Color {
    private $color;

    public function __construct(string $color) {
        $this->color = $color;
    }
    
    public function isDark() {
        $darkColors = ["black", "navy", "dark gray", "maroon", "olive"];
        return in_array($this->color, $darkColors);
    }

    public function isLight() {
        $lightColors = ["white", "yellow", "aqua", "fuchsia", "lime"];
        return in_array($this->color, $lightColors);
    }

    public function isPrimary() {
        $primaryColors = ["red", "green", "blue"];
        return in_array($this->color, $primaryColors);
    }
}
