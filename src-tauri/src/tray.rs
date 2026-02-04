use image::{Rgba, RgbaImage};
use std::f64::consts::PI;

const ICON_SIZE: u32 = 22;
const CENTER: f64 = 11.0;
const OUTER_RADIUS: f64 = 10.0;
const INNER_RADIUS: f64 = 6.5;
const RING_WIDTH: f64 = 2.5;

fn lerp_color(from: [u8; 4], to: [u8; 4], t: f64) -> [u8; 4] {
    [
        (from[0] as f64 + (to[0] as f64 - from[0] as f64) * t) as u8,
        (from[1] as f64 + (to[1] as f64 - from[1] as f64) * t) as u8,
        (from[2] as f64 + (to[2] as f64 - from[2] as f64) * t) as u8,
        (from[3] as f64 + (to[3] as f64 - from[3] as f64) * t) as u8,
    ]
}

fn get_hp_color(remaining: f64) -> [u8; 4] {
    let green = [74, 222, 128, 255];
    let yellow = [250, 204, 21, 255];
    let orange = [251, 146, 60, 255];
    let red = [248, 113, 113, 255];

    if remaining >= 75.0 {
        green
    } else if remaining >= 50.0 {
        let t = (75.0 - remaining) / 25.0;
        lerp_color(green, yellow, t)
    } else if remaining >= 25.0 {
        let t = (50.0 - remaining) / 25.0;
        lerp_color(yellow, orange, t)
    } else {
        let t = (25.0 - remaining) / 25.0;
        lerp_color(orange, red, t)
    }
}

fn get_mp_color(remaining: f64) -> [u8; 4] {
    let dark_blue = [99, 102, 241, 255];
    let blue = [59, 130, 246, 255];
    let light_blue = [56, 189, 248, 255];
    let cyan = [103, 232, 249, 255];

    if remaining >= 75.0 {
        dark_blue
    } else if remaining >= 50.0 {
        let t = (75.0 - remaining) / 25.0;
        lerp_color(dark_blue, blue, t)
    } else if remaining >= 25.0 {
        let t = (50.0 - remaining) / 25.0;
        lerp_color(blue, light_blue, t)
    } else {
        let t = (25.0 - remaining) / 25.0;
        lerp_color(light_blue, cyan, t)
    }
}

fn draw_arc(
    img: &mut RgbaImage,
    cx: f64,
    cy: f64,
    radius: f64,
    width: f64,
    fill_percent: f64,
    color: [u8; 4],
) {
    let bg_color = [40, 40, 40, 200];
    let fill_angle = (fill_percent / 100.0) * 2.0 * PI;

    for y in 0..ICON_SIZE {
        for x in 0..ICON_SIZE {
            let dx = x as f64 - cx;
            let dy = y as f64 - cy;
            let dist = (dx * dx + dy * dy).sqrt();

            if dist >= radius - width / 2.0 && dist <= radius + width / 2.0 {
                let mut angle = dy.atan2(dx) + PI / 2.0;
                if angle < 0.0 {
                    angle += 2.0 * PI;
                }

                let pixel_color = if angle <= fill_angle { color } else { bg_color };

                img.put_pixel(x, y, Rgba(pixel_color));
            }
        }
    }
}

fn draw_character(img: &mut RgbaImage, color: [u8; 4]) {
    let pixels = [
        (10, 7),
        (11, 7),
        (9, 8),
        (10, 8),
        (11, 8),
        (12, 8),
        (9, 9),
        (12, 9),
        (9, 10),
        (10, 10),
        (11, 10),
        (12, 10),
        (10, 11),
        (11, 11),
        (9, 12),
        (10, 12),
        (11, 12),
        (12, 12),
        (9, 13),
        (12, 13),
    ];

    for (x, y) in pixels {
        if x < ICON_SIZE && y < ICON_SIZE {
            img.put_pixel(x, y, Rgba(color));
        }
    }
}

pub fn generate_tray_icon(weekly_remaining: f64, period_remaining: f64) -> Vec<u8> {
    let mut img = RgbaImage::new(ICON_SIZE, ICON_SIZE);

    for pixel in img.pixels_mut() {
        *pixel = Rgba([0, 0, 0, 0]);
    }

    let hp_color = get_hp_color(weekly_remaining);
    draw_arc(
        &mut img,
        CENTER,
        CENTER,
        OUTER_RADIUS,
        RING_WIDTH,
        weekly_remaining,
        hp_color,
    );

    let mp_color = get_mp_color(period_remaining);
    draw_arc(
        &mut img,
        CENTER,
        CENTER,
        INNER_RADIUS,
        RING_WIDTH,
        period_remaining,
        mp_color,
    );

    let char_color = [220, 220, 220, 255];
    draw_character(&mut img, char_color);

    img.into_raw()
}

pub fn generate_disconnected_icon() -> Vec<u8> {
    let mut img = RgbaImage::new(ICON_SIZE, ICON_SIZE);

    for pixel in img.pixels_mut() {
        *pixel = Rgba([0, 0, 0, 0]);
    }

    let gray = [100, 100, 100, 200];
    draw_arc(
        &mut img,
        CENTER,
        CENTER,
        OUTER_RADIUS,
        RING_WIDTH,
        100.0,
        gray,
    );
    draw_arc(
        &mut img,
        CENTER,
        CENTER,
        INNER_RADIUS,
        RING_WIDTH,
        100.0,
        gray,
    );

    let char_color = [120, 120, 120, 255];
    draw_character(&mut img, char_color);

    img.into_raw()
}
