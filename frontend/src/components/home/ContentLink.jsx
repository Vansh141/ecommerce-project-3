import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { contentLinkProps } from '../../utils/links';

/**
 * A link from admin-managed content. Same-site paths use the router; https
 * links open in a new tab. An unusable value renders its content as plain text.
 */
const ContentLink = forwardRef(function ContentLink({ href, children, ...rest }, ref) {
  const props = contentLinkProps(href);
  if (!props) return <span {...rest}>{children}</span>;
  if (props.to) {
    return (
      <Link ref={ref} to={props.to} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a ref={ref} {...props} {...rest}>
      {children}
    </a>
  );
});

export default ContentLink;
