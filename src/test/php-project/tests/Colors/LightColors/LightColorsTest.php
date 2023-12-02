<?php

use PHPUnit\Framework\TestCase;
use Colors\Color;

class LightColorsTest extends TestCase {
    public function testWhite() {
        $color = new Color("white");
        $this->assertTrue($color->isLight());
    }

    public function testYellow() {
        $color = new Color("yellow");
        $this->assertTrue($color->isLight());
    }

    public function testAqua() {
        $color = new Color("aqua");
        $this->assertTrue($color->isLight());
    }

    public function testFuchsia() {
        $color = new Color("fuchsia");
        $this->assertTrue($color->isLight());
    }

    public function testLime() {
        $color = new Color("lime");
        $this->assertTrue($color->isLight());
    }
}