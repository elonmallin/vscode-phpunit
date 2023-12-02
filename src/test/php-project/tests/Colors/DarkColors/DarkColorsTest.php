<?php

use PHPUnit\Framework\TestCase;
use Colors\Color;

class DarkColorsTest extends TestCase {
    public function testBlack() {
        $color = new Color("black");
        $this->assertTrue($color->isDark());
    }

    public function testNavy() {
        $color = new Color("navy");
        $this->assertTrue($color->isDark());
    }

    public function testDarkGray() {
        $color = new Color("dark gray");
        $this->assertTrue($color->isDark());
    }

    public function testMaroon() {
        $color = new Color("maroon");
        $this->assertTrue($color->isDark());
    }

    public function testOlive() {
        $color = new Color("olive");
        $this->assertTrue($color->isDark());
    }
}
