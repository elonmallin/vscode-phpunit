<?php

use PHPUnit\Framework\TestCase;
use Math\Addition;

class AdditionTest extends TestCase {
    public function testAdd() {
        $sut = new Addition();
        $result = $sut->add(5, 3);
        $this->assertEquals(8, $result);
    }
}
