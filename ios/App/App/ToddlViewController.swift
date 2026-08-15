import UIKit
import Capacitor

// Toddler-proofing at the OS level: little fingers brush the screen
// edges constantly, and a single swipe from the top or bottom edge
// would open Notification Center or leave the app. Deferring system
// gestures means an edge swipe only shows a small grabber first and
// needs a second deliberate swipe to act — toddlers never manage it.
// (For a fully locked session, parents can still use Guided Access.)
class ToddlViewController: CAPBridgeViewController {

    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge {
        return .all
    }

    override var prefersHomeIndicatorAutoHidden: Bool {
        return true
    }
}
