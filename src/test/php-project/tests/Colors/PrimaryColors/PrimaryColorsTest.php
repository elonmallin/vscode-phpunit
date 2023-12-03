<?php

use PHPUnit\Framework\TestCase;
use Colors\Color;

class PrimaryColorsTest extends TestCase {
    public function testRed() {
        $color = new Color("red");
        $this->assertTrue($color->isPrimary());
    }

    public function testGreen() {
        $color = new Color("green");
        $this->assertTrue($color->isPrimary());
    }

    public function testBlue() {
        $color = new Color("blue");
        $this->assertTrue($color->isPrimary());
    }
}
